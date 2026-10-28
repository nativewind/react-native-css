import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

const resettingKeywords = ["initial", "unset", "revert", "revert-layer"];

const clearedProperties: readonly (readonly [
  property: string,
  earlier: string,
  cleared: Record<string, undefined>,
])[] = [
  ["background-color", "red", { backgroundColor: undefined }],
  ["opacity", "0.5", { opacity: undefined }],
  ["box-shadow", "1px 1px red", { boxShadow: undefined }],
  ["filter", "blur(2px)", { filter: undefined }],
  ["transform", "translateX(10px)", { transform: undefined }],
  ["line-height", "30px", { lineHeight: undefined }],
  [
    "text-shadow",
    "1px 1px red",
    {
      textShadowColor: undefined,
      textShadowOffset: undefined,
      textShadowRadius: undefined,
    },
  ],
  [
    "border",
    "2px solid red",
    { borderWidth: undefined, borderStyle: undefined, borderColor: undefined },
  ],
];

function renderStyle(css: string): unknown {
  registerCSS(css);

  render(<View testID="child" className="earlier child" />);

  return screen.getByTestId("child").props.style;
}

// Chromium 153, Firefox 155 and WebKit 26.6 reset each of these to its initial value, which React Native's default matches
test.each(
  clearedProperties.flatMap(([property, earlier, cleared]) =>
    resettingKeywords.map(
      (keyword) => [property, keyword, earlier, cleared] as const,
    ),
  ),
)(
  "%s: %s clears an earlier rule's value",
  (property, keyword, earlier, cleared) => {
    expect(
      renderStyle(
        `.earlier { ${property}: ${earlier}; } .child { ${property}: ${keyword}; }`,
      ),
    ).toStrictEqual(cleared);
  },
);

test.each(resettingKeywords)(
  "border-block-width: %s resets to React Native's default width",
  (keyword) => {
    expect(
      renderStyle(
        `.earlier { border-block-width: 3px; } .child { border-block-width: ${keyword}; }`,
      ),
    ).toStrictEqual({
      borderTopWidth: undefined,
      borderBottomWidth: undefined,
    });
  },
);

// Chromium 153, Firefox 155 and WebKit 26.6 apply a keyword fallback of an undefined env() as the whole value
test("padding-top: env(safe-area-inset-top, initial) clears an earlier rule's value when no inset is defined", () => {
  expect(
    renderStyle(
      `.earlier { padding-top: 10px; } .child { padding-top: env(safe-area-inset-top, initial); }`,
    ),
  ).toStrictEqual({ paddingTop: undefined });
});

// Chromium 153, Firefox 155 and WebKit 26.6 read the ancestor's value for each, as a custom property inherits (css-variables-1 §2)
test.each(["inherit", "unset", "revert", "revert-layer"])(
  "--brand: %s reads the ancestor's --brand",
  (keyword) => {
    registerCSS(`
      .parent { --brand: green; }
      .child { --brand: ${keyword}; color: var(--brand); }
      .other { --brand: ${keyword}; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "green",
    });
  },
);

const routes = [
  ["inlined", {}],
  ["kept", { inlineVariables: false }],
] as const;

function renderNested(
  css: string,
  options: (typeof routes)[number][1],
  childClassName = "child",
): unknown {
  registerCSS(css, options);

  render(
    <View className="parent">
      <View testID="child" className={childClassName} />
    </View>,
  );

  return screen.getByTestId("child").props.style;
}

// Chromium 153, Firefox 155 and WebKit 26.6 resolve the keyword on the custom property itself, so it wins over an earlier rule's value (css-variables-1 §2)
test.each(["inherit", "unset", "revert", "revert-layer"])(
  "--brand: %s over an earlier rule reads the ancestor's --brand",
  (keyword) => {
    expect(
      renderNested(
        `
          .parent { --brand: green; }
          .earlier { --brand: blue; }
          .child { --brand: ${keyword}; color: var(--brand); }
        `,
        {},
        "earlier child",
      ),
    ).toStrictEqual({ color: "green" });
  },
);

test("--brand: inherit over an earlier rule hands the subtree the ancestor's --brand", () => {
  registerCSS(`
    .parent { --brand: green; }
    .earlier { --brand: blue; }
    .middle { --brand: inherit; }
    .child { color: var(--brand); }
  `);

  render(
    <View className="parent">
      <View className="earlier middle">
        <View testID="child" className="child" />
      </View>
    </View>,
  );

  expect(screen.getByTestId("child").props.style).toStrictEqual({
    color: "green",
  });
});

test("--brand: inherit with no ancestor --brand hands the subtree the guaranteed-invalid value", () => {
  registerCSS(`
    .earlier { --brand: blue; }
    .middle { --brand: inherit; }
    .child { color: var(--brand, green); }
  `);

  render(
    <View className="parent">
      <View className="earlier middle">
        <View testID="child" className="child" />
      </View>
    </View>,
  );

  expect(screen.getByTestId("child").props.style).toStrictEqual({
    color: "green",
  });
});

// Chromium 153, Firefox 155 and WebKit 26.6: * declares on the parent too, so it is the value the parent hands down
test("--parent-own: inherit under no declaring ancestor reads what * declares", () => {
  expect(
    renderNested(
      `
        * { --parent-own: red; }
        .child { --parent-own: inherit; color: var(--parent-own, green); }
      `,
      {},
    ),
  ).toStrictEqual({ color: "red" });
});

// Chromium 153, Firefox 155 and WebKit 26.6 give a custom property set to initial the guaranteed-invalid value (css-variables-1 §2.2), so a var() reading it takes its fallback
describe.each(routes)("--brand: initial, %s", (_route, options) => {
  test("takes the var() fallback over an ancestor's --brand", () => {
    expect(
      renderNested(
        `
          .parent { --brand: blue; }
          .child { --brand: initial; color: var(--brand, green); }
        `,
        options,
      ),
    ).toStrictEqual({ color: "green" });
  });

  test("makes a custom property reading it the guaranteed-invalid value too", () => {
    expect(
      renderNested(
        `
          .child { --source: initial; --reader: var(--source); color: var(--reader, green); }
          .other { --reader: 1px; }
        `,
        options,
      ),
    ).toStrictEqual({ color: "green" });
  });

  test("hides the ancestor's --brand from a descendant", () => {
    registerCSS(
      `
        .parent { --brand: blue; }
        .middle { --brand: initial; }
        .child { color: var(--brand, green); }
      `,
      options,
    );

    render(
      <View className="parent">
        <View className="middle">
          <View testID="child" className="child" />
        </View>
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "green",
    });
  });

  test("hides a :root declaration from a descendant", () => {
    registerCSS(
      `
        :root { --hidden-root: red; }
        .middle { --hidden-root: initial; }
        .child { color: var(--hidden-root, green); }
        .other { --hidden-root: blue; }
      `,
      options,
    );

    render(
      <View className="parent">
        <View className="middle">
          <View testID="child" className="child" />
        </View>
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "green",
    });
  });

  test("over an earlier rule makes var(--brand) invalid, so the colour inherits", () => {
    expect(
      renderNested(
        `
          .parent { color: green; --brand: red; }
          .earlier { --brand: blue; }
          .child { --brand: initial; color: var(--brand); }
        `,
        options,
        "earlier child",
      ),
    ).toStrictEqual({ color: "#008000" });
  });
});

// Chromium 153, Firefox 155 and WebKit 26.6 give a custom property its var() leaves without a value the guaranteed-invalid value (css-variables-1 §3.1), so a var() reading it takes its fallback
describe.each(routes)(
  "a custom property a var() leaves without a value, %s",
  (_route, options) => {
    test("takes the var() fallback over an ancestor's declaration", () => {
      expect(
        renderNested(
          `
            .parent { --unresolved: blue; }
            .child { --unresolved: var(--missing); color: var(--unresolved, green); }
          `,
          options,
        ),
      ).toStrictEqual({ color: "green" });
    });

    test("hides the ancestor's declaration from a descendant", () => {
      registerCSS(
        `
          .parent { --unresolved-down: blue; }
          .middle { --unresolved-down: var(--missing); }
          .child { color: var(--unresolved-down, green); }
        `,
        options,
      );

      render(
        <View className="parent">
          <View className="middle">
            <View testID="child" className="child" />
          </View>
        </View>,
      );

      expect(screen.getByTestId("child").props.style).toStrictEqual({
        color: "green",
      });
    });

    test("reads the guaranteed-invalid value inside a longer value", () => {
      registerCSS(
        `.child { --source: initial; --reader: var(--source) 1px; width: var(--reader, 5px); }`,
        options,
      );

      render(<View testID="child" className="child" />);

      expect(screen.getByTestId("child").props.style).toStrictEqual({
        width: 5,
      });
    });

    test("reads it inside a function declared before the variable it reads", () => {
      registerCSS(
        `.child { --reader: calc(var(--source) * 2); --source: initial; width: var(--reader, 5px); }`,
        options,
      );

      render(<View testID="child" className="child" />);

      expect(screen.getByTestId("child").props.style).toStrictEqual({
        width: 5,
      });
    });

    test.each([
      ["declared once", ""],
      ["declared twice", ".other { --reader: 1px; }"],
    ])(
      "an empty value substituted whole lets the colour inherit, the variable %s",
      (_declarations, other) => {
        expect(
          renderNested(
            `
              .parent { color: green; }
              .child { --source: initial; --reader: var(--source,); color: var(--reader, red); }
              ${other}
            `,
            options,
          ),
        ).toStrictEqual({ color: "#008000" });
      },
    );

    test("a value whose every var() substitutes nothing clears an earlier rule's value", () => {
      registerCSS(
        `
          .earlier { margin: 5px; }
          .child { --empty-start: initial; --empty-end: initial; margin: var(--empty-start,) var(--empty-end,); }
          .other { --empty-end: 1px; }
        `,
        options,
      );

      render(<View testID="child" className="earlier child" />);

      expect(screen.getByTestId("child").props.style).toStrictEqual({
        margin: undefined,
      });
    });

    // Chromium 153, Firefox 155 and WebKit 26.6 substitute an empty custom property's value as nothing, over an ancestor's
    test("an authored empty value shadows the ancestor's, and lets the colour inherit", () => {
      expect(
        renderNested(
          `
            .parent { color: green; --authored-empty: red; }
            .child { --authored-empty: ; color: var(--authored-empty, blue); }
          `,
          options,
        ),
      ).toStrictEqual({ color: "#008000" });
    });

    test("an authored empty value substitutes nothing inside a longer value", () => {
      registerCSS(
        `.child { --authored-empty-list: ; width: calc(4px var(--authored-empty-list) + 2px); }`,
        options,
      );

      render(<View testID="child" className="child" />);

      expect(screen.getByTestId("child").props.style).toStrictEqual({
        width: 6,
      });
    });

    // Chromium 153, Firefox 155 and WebKit 26.6 unset both, reading neither the fallback nor the parent's declaration
    test("a value that resolves to nothing reads the same each time it is read", () => {
      registerCSS(
        `
          .parent { --memo: 9px; }
          .child { --memo-empty: initial; --memo: calc(var(--memo-empty,) * 2); width: var(--memo, 5px); height: var(--memo, 5px); }
          .other { --memo: 1px; --memo-empty: 1px; }
        `,
        options,
      );

      render(
        <View className="parent">
          <View testID="child" className="child" />
        </View>,
      );

      expect(screen.getByTestId("child").props.style).toStrictEqual({
        width: undefined,
        height: undefined,
      });
    });
  },
);

// Chromium 153, Firefox 155 and WebKit 26.6: the root has no parent, so inherit gives the guaranteed-invalid value there too
test.each(["inherit", "initial"])(
  ":root { --brand: %s } leaves var(--brand) its fallback",
  (keyword) => {
    expect(
      renderNested(
        `
          :root { --root-brand: ${keyword}; }
          .other { --root-brand: blue; }
          .child { color: var(--root-brand, green); }
        `,
        {},
      ),
    ).toStrictEqual({ color: "green" });
  },
);

// Chromium 153, Firefox 155 and WebKit 26.6: * declares on the element itself, below its classes
test("* { --brand: inherit } reads the parent's --brand", () => {
  expect(
    renderNested(
      `
        .parent { --universal-inherit: blue; }
        * { --universal-inherit: inherit; }
        .child { color: var(--universal-inherit, green); }
      `,
      {},
    ),
  ).toStrictEqual({ color: "blue" });
});

test("* { --brand: initial } leaves var(--brand) its fallback", () => {
  expect(
    renderNested(
      `
        * { --universal-initial: initial; }
        .other { --universal-initial: blue; }
        .child { color: var(--universal-initial, green); }
      `,
      {},
    ),
  ).toStrictEqual({ color: "green" });
});

test("--brand: inherit under *'s initial leaves var(--brand) its fallback", () => {
  expect(
    renderNested(
      `
        * { --universal-gone: initial; }
        .child { --universal-gone: inherit; color: var(--universal-gone, green); }
        .other { --universal-gone: blue; }
      `,
      {},
    ),
  ).toStrictEqual({ color: "green" });
});

test("* { --universal-over-ancestor: initial } hides an ancestor's declaration", () => {
  expect(
    renderNested(
      `
        .parent { --universal-over-ancestor: blue; }
        * { --universal-over-ancestor: initial; }
        .child { color: var(--universal-over-ancestor, green); }
      `,
      {},
    ),
  ).toStrictEqual({ color: "green" });
});

test("a class's --brand: inherit wins over *'s, and reads the parent's", () => {
  expect(
    renderNested(
      `
        .parent { --class-over-universal: blue; }
        * { --class-over-universal: red; }
        .child { --class-over-universal: inherit; color: var(--class-over-universal, green); }
      `,
      {},
    ),
  ).toStrictEqual({ color: "blue" });
});

// Chromium 153, Firefox 155 and WebKit 26.6 make a declaration whose var() resolves to nothing unset (css-variables-1 §3.1): color inherits, the others reset to their initial value, which React Native's default matches
describe.each(routes)(
  "a var() that resolves to nothing, %s",
  (_route, options) => {
    test("--brand: inherit with no ancestor --brand: the colour inherits", () => {
      expect(
        renderNested(
          `
          .parent { color: red; }
          .child { --brand: inherit; color: var(--brand); }
        `,
          options,
        ),
      ).toStrictEqual({ color: "#f00" });
    });

    test("color over an earlier rule inherits", () => {
      expect(
        renderNested(
          `
          .parent { color: green; }
          .earlier { color: red; }
          .child { color: var(--missing); }
        `,
          options,
          "earlier child",
        ),
      ).toStrictEqual({ color: "#008000" });
    });

    test.each(clearedProperties)(
      "%s clears an earlier rule's value",
      (property, earlier, cleared) => {
        registerCSS(
          `.earlier { ${property}: ${earlier}; } .child { ${property}: var(--missing); }`,
          options,
        );

        render(<View testID="child" className="earlier child" />);

        expect(screen.getByTestId("child").props.style).toStrictEqual(cleared);
      },
    );

    test("an empty fallback as the whole value inherits the colour", () => {
      expect(
        renderNested(
          `
          .parent { color: green; }
          .earlier { color: red; }
          .child { color: var(--missing,); }
        `,
          options,
          "earlier child",
        ),
      ).toStrictEqual({ color: "#008000" });
    });

    test("width: calc() of it clears an earlier rule's width", () => {
      registerCSS(
        `.earlier { width: 50px; } .child { width: calc(var(--missing) * 2); }`,
        options,
      );

      render(<View testID="child" className="earlier child" />);

      expect(screen.getByTestId("child").props.style).toStrictEqual({
        width: undefined,
      });
    });
  },
);

const earlierShadow = {
  boxShadow: [
    {
      offsetX: 1,
      offsetY: 1,
      blurRadius: 0,
      spreadDistance: 0,
      color: "#f00",
    },
  ],
};

// Chromium 153, Firefox 155 and WebKit 26.6 ignore each invalid declaration and keep the earlier value
test.each([
  ["filter", "foo(1)", "blur(2px)", { filter: [{ blur: 2 }] }],
  ["box-shadow", "foo(1)", "1px 1px red", earlierShadow],
  ["box-shadow", "1px 1px inherit", "1px 1px red", earlierShadow],
  [
    "transform",
    "foo(1)",
    "translateX(10px)",
    { transform: [{ translateX: 10 }] },
  ],
] as const)(
  "%s: %s leaves an earlier rule's value",
  (property, invalid, earlier, kept) => {
    expect(
      renderStyle(
        `.earlier { ${property}: ${earlier}; } .child { ${property}: ${invalid}; }`,
      ),
    ).toStrictEqual(kept);
  },
);

test.each([
  [
    "object-position",
    "left inherit",
    "right top",
    { contentPosition: "right top" },
  ],
  [
    "font-variant",
    "all-small-caps inherit",
    "small-caps",
    { style: { fontVariant: "small-caps" } },
  ],
  [
    "corner-shape",
    "round inherit",
    "squircle",
    { style: { borderCurve: "continuous" } },
  ],
] as const)(
  "%s: %s leaves an earlier rule's value",
  (property, invalid, earlier, kept) => {
    registerCSS(
      `.earlier { ${property}: ${earlier}; } .child { ${property}: ${invalid}; }`,
    );

    render(<View testID="child" className="earlier child" />);

    expect(screen.getByTestId("child").props).toMatchObject(kept);
  },
);
