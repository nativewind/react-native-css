import {
  compile,
  type StyleDeclaration,
  type StyleDescriptor,
} from "react-native-css/compiler";

test("hello world", () => {
  const compiled = compile(`
.my-class {
  color: red;
}`);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "my-class",
        [
          {
            d: [
              {
                color: "#f00",
              },
            ],
            s: [1, 1],
            v: [["__rn-css-color", "#f00"]],
          },
        ],
      ],
    ],
  });
});

test("reads global CSS variables", () => {
  const compiled = compile(
    `@layer theme {
      :root, :host {
        --color-red-500: oklch(63.7% 0.237 25.331);
      }
    }`,
    {
      inlineVariables: false,
    },
  );

  expect(compiled.stylesheet()).toStrictEqual({
    vr: [["color-red-500", [["#fb2c36"]]]],
  });
});

test(":root CSS variables with media queries", () => {
  const compiled = compile(
    `:root {
        @media ios {
          & {
            --my-var: System;
          }
        }

        @media android {
          & {
            --my-var: SystemAndroid;
          }
        }
      }
    `,
    {
      inlineVariables: false,
    },
  );

  expect(compiled.stylesheet()).toStrictEqual({
    vr: [
      [
        "my-var",
        [
          ["SystemAndroid", [["=", "platform", "android"]]],
          ["System", [["=", "platform", "ios"]]],
        ],
      ],
    ],
  });
});

test("removes unused CSS variables while preserving the resolved value", () => {
  const result = compile(
    `.test { --blue: blue; --green: green; --red: red; color: var(--red, var(--blue)); }`,
  ).stylesheet();
  const rule = result.s?.[0]?.[1][0];
  expect(rule?.d).toContainEqual({ color: "#f00" });
  expect(
    rule?.v?.filter(([name]) => ["red", "blue", "green"].includes(name)) ?? [],
  ).toEqual([]);
});

test("preserves excluded CSS variables using the public compiler option", () => {
  const result = compile(
    `.test { --green: green; --red: red; color: var(--red); }`,
    { inlineVariables: { exclude: ["--green"] } },
  ).stylesheet();
  const rule = result.s?.[0]?.[1][0];
  expect(rule?.v).toContainEqual(["green", "green"]);
  expect(rule?.d).toContainEqual({ color: "#f00" });
  expect(rule?.v?.some(([name]) => name === "red")).toBe(false);
});

test("multiple rules with same selector", () => {
  const compiled = compile(`
.redOrGreen:hover { 
  color: green; 
} 
  
.redOrGreen { 
  color: red; 
}
`);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "redOrGreen",
        [
          {
            d: [
              {
                color: "#f00",
              },
            ],
            s: [2, 1],
            v: [["__rn-css-color", "#f00"]],
          },
          {
            d: [
              {
                color: "#008000",
              },
            ],
            p: {
              h: 1,
            },
            s: [1, 2],
            v: [["__rn-css-color", "#008000"]],
          },
        ],
      ],
    ],
  });
});

test("transitions retain duration, property, timing, and the animated rule marker", () => {
  const rule = compile(
    `.test { color: red; transition: color 1s linear; }`,
  ).stylesheet().s?.[0]?.[1][0];
  expect(rule?.a).toBe(true);
  expect(rule?.d).toContainEqual({
    color: "#f00",
    transitionProperty: ["color"],
    transitionDuration: [1000],
    transitionDelay: [0],
    transitionTimingFunction: "linear",
  });
});

test("animations preserve named keyframes and their timing contract", () => {
  const result = compile(
    `.test { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`,
  ).stylesheet();
  const rule = result.s?.[0]?.[1][0];
  expect(rule?.a).toBe(true);
  expect(rule?.d).toContainEqual(
    expect.objectContaining({
      animationDuration: [1000],
      animationIterationCount: ["infinite"],
      animationTimingFunction: "linear",
    }),
  );
  expect(rule?.d).toContainEqual([
    [[{}, "animationName", ["spin"], 1]],
    "animationName",
  ]);
  expect(result.k).toEqual([
    [
      "spin",
      [["to", [[[{}, "transform", [[{}, "rotate", "360deg"]]], "transform"]]]],
    ],
  ]);
});

test("breaks apart comma separated variables", () => {
  const compiled = compile(
    `
    :root { 
      --test: blue, green;
    }
  `,
    {
      inlineVariables: false,
    },
  );

  expect(compiled.stylesheet()).toStrictEqual({
    vr: [["test", [[["blue", "green"]]]]],
  });
});

test("light-dark()", () => {
  const compiled = compile(`
.my-class {
  background-color: light-dark(#333b3c, #efefec);
}`);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "my-class",
        [
          {
            d: [
              {
                backgroundColor: "#333b3c",
              },
            ],
            s: [1, 1],
          },
          {
            d: [
              {
                backgroundColor: "#efefec",
              },
            ],
            m: [["=", "prefers-color-scheme", "dark"]],
            s: [1, 1],
          },
        ],
      ],
    ],
  });
});

test("media query nested in rules", () => {
  const compiled = compile(`
.my-class {
  color: red;
  @media (min-width: 600px) {
    color: blue;

    @media (min-width: 400px) {
      background-color: green;
    }
  }

  @media (min-width: 100px) {
    background-color: yellow;

  }
}`);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "my-class",
        [
          {
            d: [{ color: "#f00" }],
            s: [1, 1],
            v: [["__rn-css-color", "#f00"]],
          },
          {
            d: [
              {
                color: "#00f",
              },
            ],
            m: [[">=", "width", 600]],
            s: [2, 1],
            v: [["__rn-css-color", "#00f"]],
          },
          {
            d: [{ backgroundColor: "#008000" }],
            m: [
              [">=", "width", 600],
              [">=", "width", 400],
            ],
            s: [3, 1],
          },
          {
            d: [{ backgroundColor: "#ff0" }],
            m: [[">=", "width", 100]],
            s: [4, 1],
          },
        ],
      ],
    ],
  });
});

test("container queries", () => {
  const compiled = compile(`
  @container (width > 400px) {
    .child {
      color: blue;
    }
  }`);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "child",
        [
          {
            cq: [{ m: [">", "width", 400] }],
            d: [{ color: "#00f" }],
            s: [2, 1],
            v: [["__rn-css-color", "#00f"]],
          },
        ],
      ],
    ],
  });
});

test("warnings", () => {
  const compiled = compile(`
.my-class {
    invalid-property: red;
    z-index: auto; 
    color: random();
}`);

  expect(compiled.stylesheet()).toStrictEqual({});

  expect(compiled.warnings()).toStrictEqual({
    properties: ["invalid-property"],
    values: {
      "z-index": ["auto"],
      "color": ["random()"],
    },
  });
});

test("simplifies rem", () => {
  const compiled = compile(`.test {
    border-width: calc(10rem + 2px);
  }`);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "test",
        [
          {
            d: [
              {
                borderWidth: 142,
              },
            ],
            s: [1, 1],
          },
        ],
      ],
    ],
  });
});

// Chromium 153, Firefox 155 and WebKit 26.6 compute each keyword below as css-cascade-5 §7.3 defines it
describe("CSS-wide keywords", () => {
  const stylesheetFor = (value: string) =>
    compile(`.child { color: ${value}; }`).stylesheet();

  test("color: inherit compiles to the inherited-color lookup and publishes it", () => {
    expect(stylesheetFor("inherit")).toStrictEqual({
      s: [
        [
          "child",
          [
            {
              s: [1, 1],
              d: [[[{}, "var", "__rn-css-color"], "color", 1]],
              dv: 1,
              v: [["__rn-css-color", [{}, "var", "__rn-css-color"]]],
            },
          ],
        ],
      ],
    });
  });

  test("color: inherit and color: currentcolor compile alike", () => {
    // currentColor on `color` is `inherit` (css-color-3 §4.4)
    expect(stylesheetFor("inherit")).toStrictEqual(
      stylesheetFor("currentcolor"),
    );
  });

  test("color: currentcolor compiles to the inherited-color lookup and publishes it", () => {
    expect(stylesheetFor("currentcolor")).toStrictEqual({
      s: [
        [
          "child",
          [
            {
              s: [1, 1],
              d: [[[{}, "var", "__rn-css-color"], "color", 1]],
              dv: 1,
              v: [["__rn-css-color", [{}, "var", "__rn-css-color"]]],
            },
          ],
        ],
      ],
    });
  });

  test("a colour of its own publishes --__rn-css-color to descendants", () => {
    expect(stylesheetFor("red")).toStrictEqual({
      s: [
        [
          "child",
          [
            {
              s: [1, 1],
              d: [{ color: "#f00" }],
              v: [["__rn-css-color", "#f00"]],
            },
          ],
        ],
      ],
    });
  });

  test.each(["unset", "revert", "revert-layer"])(
    "color: %s compiles like color: inherit",
    (keyword) => {
      // `unset` on an inherited property is `inherit` (css-cascade-5 §7.3.3), and with no user-agent or user origin `revert` is `unset` (§7.3.4)
      expect(stylesheetFor(keyword)).toStrictEqual(stylesheetFor("inherit"));
    },
  );

  test("color: initial compiles to the literal the runtime clears with", () => {
    expect(stylesheetFor("initial")).toStrictEqual({
      s: [
        [
          "child",
          [
            {
              s: [1, 1],
              d: [["unset", "color"]],
              v: [["__rn-css-color", "unset"]],
            },
          ],
        ],
      ],
    });
  });

  const otherProperties = [
    ["background-color", "backgroundColor"],
    ["border-color", "borderColor"],
    ["font-size", "fontSize"],
    ["opacity", "opacity"],
  ] as const;

  test.each(otherProperties)("%s: inherit is dropped", (property) => {
    // Only `color` and custom properties carry a value to descendants here
    expect(
      compile(`.child { ${property}: inherit; }`).stylesheet(),
    ).toStrictEqual({});
  });

  test.each(
    otherProperties.flatMap(([property, nativeProperty]) =>
      (["initial", "unset", "revert", "revert-layer"] as const).map(
        (keyword) => [property, keyword, nativeProperty] as const,
      ),
    ),
  )(
    "%s: %s compiles to the literal the runtime clears with",
    (property, keyword, nativeProperty) => {
      expect(
        declarationsFor(`.child { ${property}: ${keyword}; }`),
      ).toStrictEqual([["unset", nativeProperty]]);
    },
  );

  test.each([
    ["box-shadow", "boxShadow"],
    ["text-shadow", "textShadow"],
  ] as const)(
    "%s: initial hands the literal to the shorthand's runtime parser",
    (property, nativeProperty) => {
      expect(declarationsFor(`.child { ${property}: initial; }`)).toStrictEqual(
        [[[{}, nativeProperty, "unset", 1], nativeProperty, 1]],
      );
    },
  );

  test("box-shadow: inherit is dropped rather than handed to the shorthand", () => {
    expect(
      compile(`.child { box-shadow: inherit; }`).stylesheet(),
    ).toStrictEqual({});
  });

  test.each([
    ["object-fit", "initial", ["contentFit"]],
    ["object-position", "revert", ["contentPosition"]],
    ["corner-shape", "unset", "borderCurve"],
    ["font-variant", "revert-layer", "fontVariant"],
    ["-webkit-line-clamp", "initial", ["numberOfLines"]],
    ["outline-offset", "initial", "outlineOffset"],
  ] as const)(
    "%s: %s compiles to the literal the runtime clears with",
    (property, keyword, nativeProperty) => {
      expect(
        declarationsFor(`.child { ${property}: ${keyword}; }`),
      ).toStrictEqual([["unset", nativeProperty]]);
    },
  );

  test.each(["object-fit", "corner-shape"])(
    "%s: inherit is dropped with a warning naming it",
    (property) => {
      const compiled = compile(`.child { ${property}: inherit; }`);

      expect(compiled.stylesheet()).toStrictEqual({});
      expect(compiled.warnings()).toStrictEqual({
        values: { [property]: ["inherit"] },
      });
    },
  );

  test.each([
    ["color", "color-mix(in srgb, inherit, blue)"],
    ["color", "light-dark(inherit, blue)"],
    ["color", "light-dark(blue, inherit)"],
    ["color", "rgb(0 0 0 / inherit)"],
    ["filter", "blur(inherit)"],
    ["transform", "translateX(inherit)"],
    ["object-position", "left inherit"],
    ["corner-shape", "round inherit"],
    ["font-variant", "small-caps inherit"],
    ["box-shadow", "1px 1px INHERIT"],
  ])(
    "%s: %s is dropped, as a CSS-wide keyword is only ever a whole value",
    (property, value) => {
      const compiled = compile(`.child { ${property}: ${value}; }`);

      expect(compiled.stylesheet()).toStrictEqual({});
      expect(compiled.warnings()).toStrictEqual({
        values: {
          [property]: [value.includes("INHERIT") ? "INHERIT" : "inherit"],
        },
      });
    },
  );

  test.each([
    ["inherit", [{}, "var", "__rn-css-color"]],
    ["INITIAL", "unset"],
  ] as const)(
    "color: var(--missing, %s) falls back to what the keyword resolves to",
    (keyword, fallback) => {
      // Substituted, a fallback is the declaration's whole value (css-variables-1 §3)
      expect(
        declarationsFor(`.child { color: var(--missing, ${keyword}); }`),
      ).toStrictEqual([[[{}, "var", ["missing", fallback], 1], "color", 1]]);
    },
  );

  // A second declaration keeps `--brand` from being inlined, so the keyword reaches the compiler on the custom property
  const uninlinedCustomProperty = (value: string) =>
    `.child { --brand: ${value}; color: var(--brand); }
     .other { --brand: ${value}; }`;

  test.each(["inherit", "unset", "revert", "revert-layer", "INHERIT"])(
    "--brand: %s publishes nothing, so a read finds the ancestor's value",
    (keyword) => {
      const css = uninlinedCustomProperty(keyword);

      expect(publishedVariable(css, "brand")).toEqual([]);
      expect(compile(css).warnings()).toStrictEqual({});
    },
  );

  test("--brand: initial is dropped with a warning", () => {
    const css = uninlinedCustomProperty("initial");

    expect(publishedVariable(css, "brand")).toEqual([]);
    expect(compile(css).warnings()).toStrictEqual({
      values: { "--brand": ["initial", "initial"] },
    });
  });

  test("--brand: 1px INHERIT stays declared, and its keyword is dropped with a warning", () => {
    const css = uninlinedCustomProperty("1px INHERIT");

    expect(publishedVariable(css, "brand")).toEqual([1, 1]);
    expect(compile(css).warnings()).toStrictEqual({
      values: { "--brand": ["INHERIT", "INHERIT"] },
    });
  });

  test("a comment beside a keyword leaves the keyword the whole value", () => {
    expect(stylesheetFor("/* reset */ inherit")).toStrictEqual(
      stylesheetFor("inherit"),
    );
    expect(
      declarationsFor(
        `.child { color: var(--missing, /* reset */ inherit /* here */); }`,
      ),
    ).toStrictEqual(
      declarationsFor(`.child { color: var(--missing, inherit); }`),
    );
    expect(
      publishedVariable(
        uninlinedCustomProperty("/* reset */ inherit"),
        "brand",
      ),
    ).toEqual([]);
  });

  test.each(["currentcolor", "currentColor"])(
    "--brand: %s compiles to the inherited-color lookup",
    (spelling) => {
      // lightningcss hands a custom property's tokens through unfolded, so `currentColor` relies on the compiler's case fold
      expect(
        publishedVariable(uninlinedCustomProperty(spelling), "brand"),
      ).toEqual([
        [{}, "var", "__rn-css-color"],
        [{}, "var", "__rn-css-color"],
      ]);
    },
  );

  test("a custom property declared once is inlined, so its keyword resolves on color", () => {
    expect(
      compile(`.child { --brand: inherit; color: var(--brand); }`).stylesheet(),
    ).toStrictEqual({
      s: [
        [
          "child",
          [
            {
              s: [1, 1],
              d: [[[{}, "var", "__rn-css-color"], "color", 1]],
              dv: 1,
              v: [["__rn-css-color", [{}, "var", "__rn-css-color"]]],
            },
          ],
        ],
      ],
    });
  });

  test.each(["INHERIT", "Inherit", "UNSET", "INITIAL"])(
    "color: %s compiles like its lowercase spelling",
    (spelling) => {
      // Keywords are ASCII case-insensitive (css-values-4 §4.1), and lightningcss hands an unparsed one through unfolded
      expect(stylesheetFor(spelling)).toStrictEqual(
        stylesheetFor(spelling.toLowerCase()),
      );
    },
  );

  test("color: currentColor compiles to the inherited-color lookup", () => {
    expect(stylesheetFor("currentColor")).toStrictEqual({
      s: [
        [
          "child",
          [
            {
              s: [1, 1],
              d: [[[{}, "var", "__rn-css-color"], "color", 1]],
              dv: 1,
              v: [["__rn-css-color", [{}, "var", "__rn-css-color"]]],
            },
          ],
        ],
      ],
    });
  });

  test("border-color: currentcolor compiles to the same lookup", () => {
    expect(
      compile(`.child { border-color: currentcolor; }`).stylesheet(),
    ).toStrictEqual({
      s: [
        [
          "child",
          [
            {
              s: [1, 1],
              d: [[[{}, "var", "__rn-css-color"], "borderColor", 1]],
              dv: 1,
            },
          ],
        ],
      ],
    });
  });

  test("color: inherit !important keeps the important specificity", () => {
    expect(stylesheetFor("inherit !important")).toStrictEqual({
      s: [
        [
          "child",
          [
            {
              s: [1, 1, 1],
              d: [[[{}, "var", "__rn-css-color"], "color", 1]],
              dv: 1,
              v: [["__rn-css-color", [{}, "var", "__rn-css-color"]]],
            },
          ],
        ],
      ],
    });
  });

  test("color: inherit inside a media query keeps the condition", () => {
    expect(
      compile(
        `@media (min-width: 100px) { .child { color: inherit; } }`,
      ).stylesheet(),
    ).toStrictEqual({
      s: [
        [
          "child",
          [
            {
              s: [2, 1],
              m: [[">=", "width", 100]],
              d: [[[{}, "var", "__rn-css-color"], "color", 1]],
              dv: 1,
              v: [["__rn-css-color", [{}, "var", "__rn-css-color"]]],
            },
          ],
        ],
      ],
    });
  });

  test("color: inherit inside :hover keeps the pseudo-class condition", () => {
    expect(
      compile(`.child:hover { color: inherit; }`).stylesheet(),
    ).toStrictEqual({
      s: [
        [
          "child",
          [
            {
              s: [1, 2],
              d: [[[{}, "var", "__rn-css-color"], "color", 1]],
              dv: 1,
              v: [["__rn-css-color", [{}, "var", "__rn-css-color"]]],
              p: { h: 1 },
            },
          ],
        ],
      ],
    });
  });

  test("color: inherit on ::placeholder targets placeholderTextColor", () => {
    expect(
      declarationsFor(`.child::placeholder { color: inherit; }`),
    ).toStrictEqual([
      [[{}, "var", "__rn-css-color"], ["placeholderTextColor"], 1],
    ]);
  });

  test.each(["placeholder", "selection"])(
    "a ::%s rule publishes no colour, and keeps its other custom properties",
    (pseudoElement) => {
      const css = `.child::${pseudoElement} { --brand: red; color: var(--brand); } .other { --brand: blue; }`;

      expect(publishedInheritedColors(css)).toEqual([]);
      expect(publishedVariable(css, "brand")).toEqual(["red", "blue"]);
    },
  );
});

function declarationsFor(css: string): StyleDeclaration[] {
  return (compile(css).stylesheet().s ?? []).flatMap(([, ruleSet]) =>
    ruleSet.flatMap((rule) => rule.d ?? []),
  );
}

function publishedVariable(css: string, name: string): StyleDescriptor[] {
  return (compile(css).stylesheet().s ?? []).flatMap(([, ruleSet]) =>
    ruleSet.flatMap((rule) =>
      (rule.v ?? [])
        .filter(([varName]) => varName === name)
        .map(([, value]) => value),
    ),
  );
}

function publishedInheritedColors(css: string): StyleDescriptor[] {
  return publishedVariable(css, "__rn-css-color");
}

describe("the inherited-color variable is never a lookup into itself", () => {
  // Each reads the inherited colour somewhere in its descriptor, so it publishes the bare lookup, which the runtime answers with what the element inherited
  const colorsThatReadTheInheritedColor = [
    "inherit",
    "unset",
    "currentcolor",
    "var(--missing, inherit)",
    "var(--missing, unset)",
    "var(--missing, currentcolor)",
    "color-mix(in srgb, currentcolor, blue)",
    "rgb(from currentcolor r g b)",
    "light-dark(currentcolor, blue)",
  ];

  test.each(colorsThatReadTheInheritedColor)(
    "color: %s publishes the bare lookup",
    (value) => {
      const published = publishedInheritedColors(`.child { color: ${value}; }`);

      expect(new Set(published.map((entry) => JSON.stringify(entry)))).toEqual(
        new Set([JSON.stringify([{}, "var", "__rn-css-color"])]),
      );
    },
  );

  test.each([
    ["red", "#f00"],
    ["#00f", "#00f"],
    ["rgb(1 2 3)", "#010203"],
    ["color-mix(in srgb, red, blue)", "#800080"],
    ["oklch(0.7 0.1 200)", "#40b1b7"],
  ])("color: %s still publishes its own resolved value", (value, expected) => {
    expect(publishedInheritedColors(`.child { color: ${value}; }`)).toEqual([
      expected,
    ]);
  });

  test.each<[value: string, published: StyleDescriptor[]]>([
    ["var(--brand)", [[{}, "var", "brand", 1]]],
    ["var(--brand, red)", [[{}, "var", ["brand", "red"], 1]]],
    [
      "color-mix(in srgb, var(--brand), blue)",
      [
        [
          {},
          "colorMix",
          ["srgb", [{}, "var", "brand", 1], undefined, "blue", undefined],
        ],
      ],
    ],
  ])(
    "color: %s names a variable that is not the inherited one, so it publishes",
    (value, published) => {
      expect(publishedInheritedColors(`.child { color: ${value}; }`)).toEqual(
        published,
      );
    },
  );

  test("color: light-dark() emits no rule twice", () => {
    // Parsing light-dark() adds its dark rule as a side effect, so the colour is parsed once for the declaration and its publish
    const rules = (
      compile(`.child { color: light-dark(red, blue); }`).stylesheet().s ?? []
    ).flatMap(([, ruleSet]) => ruleSet.map((rule) => JSON.stringify(rule)));

    expect(new Set(rules).size).toBe(rules.length);
  });
});
