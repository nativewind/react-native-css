import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

describe("hsl", () => {
  test("inline", () => {
    registerCSS(`.my-class { color: hsl(0 84.2% 60.2%); }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef4444" },
      testID,
    });
  });

  test("inline with comma", () => {
    registerCSS(`.my-class {
      color: hsl(0, 84.2%, 60.2%);
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef4444" },
      testID,
    });
  });

  test("var with spaces", () => {
    registerCSS(`.my-class {
      --primary: 0 84.2% 60.2%;
      color: hsl(var(--primary));
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef4444" },
      testID,
    });
  });

  test("var with comma", () => {
    registerCSS(`.my-class {
        --primary: 0, 84.2%, 60.2%;
        color: hsl(var(--primary));
      }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef4444" },
      testID,
    });
  });
});

describe("hsla", () => {
  test("inline with slash", () => {
    registerCSS(`.my-class {
      color: hsla(0 84.2% 60.2% / 60%);
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef444499" },
      testID,
    });
  });

  test("inline with comma", () => {
    registerCSS(`.my-class {
      color: hsla(0, 84.2%, 60.2%, 60%);
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef444499" },
      testID,
    });
  });

  test("function with slash", () => {
    registerCSS(`.my-class {
      --primary: 0 84.2% 60.2% / 60%;
      color: hsla(var(--primary));
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef444499" },
      testID,
    });
  });

  test("function with comma", () => {
    registerCSS(`.my-class {
      --primary: 0, 84.2%, 60.2%, 60%;
      color: hsla(var(--primary));
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef444499" },
      testID,
    });
  });
});

describe("currentcolor", () => {
  test("currentcolor and global variables", () => {
    registerCSS(`
      @layer theme {
        :root {
          --color-red-500: red;
        }
      }
      @layer utilities {
        .bg-current {
          background-color: currentcolor;
        }
        .text-red-500 {
          color: var(--color-red-500);
        }
      }
    `);

    render(<View testID={testID} className="bg-current text-red-500" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#f00", backgroundColor: "#f00" },
      testID,
    });
  });
});

describe("inherit", () => {
  test("color: inherit resolves to the parent's color", () => {
    registerCSS(`
      .parent { color: red; }
      .child { color: inherit; }
    `);

    render(
      <View testID="parent" className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("color: inherit on a Text reads its parent's color", () => {
    registerCSS(`
      .button { color: white; }
      .label { color: inherit; }
    `);

    render(
      <View testID="button" className="button">
        <Text testID="label" className="label" />
      </View>,
    );

    expect(screen.getByTestId("label").props.style).toStrictEqual({
      color: "#fff",
    });
  });

  test("inherit chains through an inheriting ancestor", () => {
    registerCSS(`
      .parent { color: red; }
      .mid { color: inherit; }
      .child { color: inherit; }
    `);

    render(
      <View testID="parent" className="parent">
        <View testID="mid" className="mid">
          <View testID="child" className="child" />
        </View>
      </View>,
    );

    expect(screen.getByTestId("mid").props.style).toStrictEqual({
      color: "#f00",
    });
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("inherit follows the nearest colored ancestor", () => {
    registerCSS(`
      .outer { color: red; }
      .inner { color: blue; }
      .child { color: inherit; }
    `);

    render(
      <View className="outer">
        <View className="inner">
          <View testID="child" className="child" />
        </View>
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#00f",
    });
  });

  test("color: unset inherits the parent's color", () => {
    // `unset` on an inherited property is `inherit` (css-cascade-5 §7.3.3)
    registerCSS(`
      .parent { color: red; }
      .child { color: unset; }
    `);

    render(
      <View testID="parent" className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test.each(["UNSET", "INHERIT", "Inherit"])(
    "color: %s is case-folded and inherits",
    (spelling) => {
      registerCSS(`
        .parent { color: red; }
        .child { color: ${spelling}; }
      `);

      render(
        <View className="parent">
          <View testID="child" className="child" />
        </View>,
      );

      expect(screen.getByTestId("child").props.style).toStrictEqual({
        color: "#f00",
      });
    },
  );

  test("color: INITIAL clears an earlier rule's color", () => {
    // React Native's default text color stands in for the initial value
    registerCSS(`
      .parent { color: red; }
      .earlier { color: green; }
      .child { color: INITIAL; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="earlier child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: undefined,
    });
  });

  test("a descendant override restarts the chain", () => {
    registerCSS(`
      .red { color: red; }
      .blue { color: blue; }
      .inherit { color: inherit; }
    `);

    render(
      <View className="red">
        <View testID="first" className="inherit">
          <View className="blue">
            <View testID="second" className="inherit" />
          </View>
        </View>
      </View>,
    );

    expect(screen.getByTestId("first").props.style).toStrictEqual({
      color: "#f00",
    });
    expect(screen.getByTestId("second").props.style).toStrictEqual({
      color: "#00f",
    });
  });

  test("color: inherit under a media query", () => {
    registerCSS(`
      .parent { color: red; }
      @media (min-width: 1px) { .child { color: inherit; } }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("color: inherit under :hover", () => {
    registerCSS(`
      .parent { color: red; }
      .child { color: blue; }
      .child:hover { color: inherit; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    const child = screen.getByTestId("child");
    expect(child.props.style).toStrictEqual({ color: "#00f" });

    fireEvent(child, "hoverIn", {});
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("color: inherit !important beats a normal color on the same element", () => {
    registerCSS(`
      .parent { color: red; }
      .child { color: inherit !important; }
      .override { color: blue; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child override" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("color: inherit on ::placeholder reads the parent's color", () => {
    // React Native has no default input colour to inherit, so this matches Tailwind's preflight `input { color: inherit }`
    registerCSS(`
      .parent { color: red; }
      .child::placeholder { color: inherit; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props).toStrictEqual({
      children: undefined,
      placeholderTextColor: "#f00",
      style: {},
      testID: "child",
    });
  });

  test.each(["inherit", "currentcolor"])(
    "color: %s on ::placeholder reads the element's own color",
    (keyword) => {
      registerCSS(`
        .parent { color: red; }
        .child { color: green; }
        .child::placeholder { color: ${keyword}; }
      `);

      render(
        <View className="parent">
          <View testID="child" className="child" />
        </View>,
      );

      expect(screen.getByTestId("child").props).toStrictEqual({
        children: undefined,
        placeholderTextColor: "#008000",
        style: { color: "#008000" },
        testID: "child",
      });
    },
  );

  test("color: inherit with no colored ancestor reads the root's label color", () => {
    registerCSS(`.child { color: inherit; }`);

    render(<View testID="child" className="child" />);

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: { semantic: ["label", "labelColor"] },
    });
  });

  test("inherit resolves an ancestor color from an inlined variable", () => {
    registerCSS(`
      .parent { --brand: #ff0000; color: var(--brand); }
      .child { color: inherit; }
    `);

    render(
      <View testID="parent" className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("parent").props.style).toStrictEqual({
      color: "#f00",
    });
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("inherit resolves an ancestor color from a variable that is not inlined", () => {
    // A second declaration keeps `--brand` from being inlined
    registerCSS(`
      .parent { --brand: #ff0000; color: var(--brand); }
      .child { --brand: #0000ff; color: inherit; }
    `);

    render(
      <View testID="parent" className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    const parentColor = screen.getByTestId("parent").props.style.color;

    expect(parentColor).toBeDefined();
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: parentColor,
    });
  });

  test("color: var(--brand) with --brand: inherit resolves when the variable is inlined", () => {
    registerCSS(`
      .parent { color: red; }
      .child { --brand: inherit; color: var(--brand); }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test.each([
    ["currentcolor", "inlined"],
    ["currentcolor", "uninlined"],
    ["currentColor", "inlined"],
    ["currentColor", "uninlined"],
  ] as const)(
    "color: var(--brand) with --brand: %s resolves on the %s route",
    (spelling, route) => {
      // lightningcss hands a custom property's tokens through unfolded, so `currentColor` relies on the compiler's case fold
      const secondDefinition =
        route === "uninlined" ? `.other { --brand: ${spelling}; }` : "";

      registerCSS(`
        .parent { color: red; }
        .child { --brand: ${spelling}; color: var(--brand); }
        ${secondDefinition}
      `);

      render(
        <View className="parent">
          <View testID="child" className="child" />
        </View>,
      );

      expect(screen.getByTestId("child").props.style).toStrictEqual({
        color: "#f00",
      });
    },
  );

  test("color: inherit alongside a box-shadow leaves no placeholder in the style", () => {
    registerCSS(`
      .parent { color: red; }
      .child { color: inherit; box-shadow: 1px 1px blue; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
      boxShadow: [
        {
          offsetX: 1,
          offsetY: 1,
          blurRadius: 0,
          spreadDistance: 0,
          color: "#00f",
        },
      ],
    });
  });

  test("color: currentcolor alongside a box-shadow leaves no placeholder either", () => {
    registerCSS(`
      .parent { color: red; }
      .child { color: currentcolor; box-shadow: 1px 1px blue; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
      boxShadow: [
        {
          offsetX: 1,
          offsetY: 1,
          blurRadius: 0,
          spreadDistance: 0,
          color: "#00f",
        },
      ],
    });
  });

  test("color: inherit alongside a text-shadow leaves no placeholder either", () => {
    registerCSS(`
      .parent { color: red; }
      .child { color: inherit; text-shadow: 1px 1px 2px blue; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
      textShadowColor: "#00f",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    });
  });

  test.each(["inherit", "unset", "currentcolor", "revert", "revert-layer"])(
    "color: %s over an earlier rule hands its subtree the parent's color",
    (keyword) => {
      // With no user-agent or user origin, `revert` is `unset` (css-cascade-5 §7.3.4)
      registerCSS(`
        .parent { color: red; }
        .earlier { color: green; }
        .mid { color: ${keyword}; border-color: currentcolor; }
        .child { color: inherit; }
      `);

      render(
        <View className="parent">
          <View testID="mid" className="earlier mid">
            <View testID="child" className="child" />
          </View>
        </View>,
      );

      expect(screen.getByTestId("mid").props.style).toStrictEqual({
        color: "#f00",
        borderColor: "#f00",
      });
      expect(screen.getByTestId("child").props.style).toStrictEqual({
        color: "#f00",
      });
    },
  );

  test("a ::placeholder color leaves the element's own color", () => {
    registerCSS(`
      .parent { color: blue; }
      .child { border-color: currentcolor; }
      .child::placeholder { color: red; }
      .grandchild { color: inherit; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child">
          <View testID="grandchild" className="grandchild" />
        </View>
      </View>,
    );

    const child = screen.getByTestId("child");

    expect(child.props.placeholderTextColor).toBe("#f00");
    expect(child.props.style).toStrictEqual({ borderColor: "#00f" });
    expect(screen.getByTestId("grandchild").props.style).toStrictEqual({
      color: "#00f",
    });
  });

  test.each(["color-mix(in srgb, inherit, blue)", "light-dark(inherit, blue)"])(
    "color: %s leaves an earlier rule's color",
    (value) => {
      // A CSS-wide keyword is only ever a whole value, so this declaration is invalid (css-values-4 §2.1)
      registerCSS(`
        .parent { color: red; }
        .earlier { color: green; }
        .child { color: ${value}; }
      `);

      render(
        <View className="parent">
          <View testID="child" className="earlier child" />
        </View>,
      );

      expect(screen.getByTestId("child").props.style).toStrictEqual({
        color: "#008000",
      });
    },
  );

  test.each([
    ["var(--missing, inherit)", "#f00"],
    ["var(--missing, initial)", undefined],
    ["var(--missing, var(--also-missing, inherit))", "#f00"],
  ] as const)(
    "color: %s applies the keyword over an earlier rule",
    (value, expectedColor) => {
      registerCSS(`
        .parent { color: red; }
        .earlier { color: green; }
        .child { color: ${value}; }
      `);

      render(
        <View className="parent">
          <View testID="child" className="earlier child" />
        </View>,
      );

      expect(screen.getByTestId("child").props.style).toStrictEqual({
        color: expectedColor,
      });
    },
  );

  test("a light-dark() ancestor's color is inherited by a descendant", () => {
    registerCSS(`
      .parent { color: light-dark(red, blue); }
      .child { color: inherit; }
    `);

    render(
      <View testID="parent" className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("parent").props.style).toStrictEqual({
      color: "#f00",
    });
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });
});

const colorsThatReadTheInheritedColor: [css: string, midColor: string][] = [
  ["inherit", "#f00"],
  ["unset", "#f00"],
  ["currentcolor", "#f00"],
  ["var(--missing, inherit)", "#f00"],
  ["var(--missing, unset)", "#f00"],
  ["var(--missing, currentcolor)", "#f00"],
  ["light-dark(currentcolor, blue)", "#f00"],
  ["color-mix(in srgb, currentcolor, blue)", "rgba(127.5, 0, 127.5, 1)"],
];

describe("a color that reads the inherited color", () => {
  test.each(colorsThatReadTheInheritedColor)(
    "mid { color: %s } resolves against its parent",
    (midColorValue, expectedMidColor) => {
      registerCSS(`
        .parent { color: red; }
        .mid { color: ${midColorValue}; }
      `);

      render(
        <View className="parent">
          <View testID="mid" className="mid" />
        </View>,
      );

      expect(screen.getByTestId("mid").props.style).toStrictEqual({
        color: expectedMidColor,
      });
    },
  );

  test.each(colorsThatReadTheInheritedColor)(
    "a child of mid { color: %s } inherits mid's colour",
    (midColorValue, expectedMidColor) => {
      registerCSS(`
        .parent { color: red; }
        .mid { color: ${midColorValue}; }
        .child { color: inherit; }
      `);

      render(
        <View className="parent">
          <View className="mid">
            <View testID="child" className="child" />
          </View>
        </View>,
      );

      expect(screen.getByTestId("child").props.style).toStrictEqual({
        color: expectedMidColor,
      });
    },
  );
});

// Chromium 153, Firefox 155 and WebKit 26.6 agree on each case: currentcolor is the inherited colour only inside `color` itself
describe("currentcolor inside color reads the inherited colour, and nowhere else", () => {
  test.each([
    [
      "box-shadow",
      "box-shadow: 0 0 1px currentcolor;",
      {
        boxShadow: [
          {
            offsetX: 0,
            offsetY: 0,
            blurRadius: 1,
            spreadDistance: 0,
            color: "#00f",
          },
        ],
      },
    ],
    [
      "text-shadow",
      "text-shadow: 1px 1px 1px currentcolor;",
      {
        textShadowColor: "#00f",
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
      },
    ],
  ] as const)(
    "%s reads the element's own colour",
    (_property, declaration, shadowStyle) => {
      registerCSS(`
        .parent { color: #ff0000; }
        .child { color: #0000ff; ${declaration} }
      `);

      render(
        <View className="parent">
          <View testID="child" className="child" />
        </View>,
      );

      expect(screen.getByTestId("child").props.style).toStrictEqual({
        color: "#00f",
        ...shadowStyle,
      });
    },
  );

  test("color-mix() of currentcolor on color mixes the inherited colour", () => {
    registerCSS(`
      .parent { color: #ff0000; }
      .child { color: color-mix(in srgb, currentcolor, #0000ff); }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "rgba(127.5, 0, 127.5, 1)",
    });
  });
});

// css-color-4 §4.3: `currentcolor` as `color`'s value is the inherited colour, and css-cascade-5 §7.2 hands a child the parent's computed colour, so neither depends on where a variable carries the value
describe("a color read through a kept variable", () => {
  test.each([
    ["currentcolor", "#f00"],
    ["light-dark(currentcolor, blue)", "#f00"],
  ])(
    "mid { --c: %s; color: var(--c) } resolves against its parent",
    (value, expected) => {
      registerCSS(
        `
        .parent { color: red; }
        .mid { --c: ${value}; color: var(--c); }
      `,
        { inlineVariables: false },
      );

      render(
        <View className="parent">
          <View testID="mid" className="mid" />
        </View>,
      );

      expect(screen.getByTestId("mid").props.style).toStrictEqual({
        color: expected,
      });
    },
  );

  test("a child inherits the colour currentcolor read through a variable gave its parent", () => {
    registerCSS(
      `
        :root { --c: currentcolor; }
        .parent { color: red; }
        .mid { color: var(--c); }
        .child { color: inherit; }
      `,
      { inlineVariables: false },
    );

    render(
      <View className="parent">
        <View className="mid">
          <View testID="child" className="child" />
        </View>
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("a child inherits its parent's computed colour, not the parent's variable read again in the child", () => {
    registerCSS(
      `
        .mid { --x: #123456; color: var(--x); }
        .child { --x: #654321; color: inherit; }
      `,
      { inlineVariables: false },
    );

    render(
      <View className="mid">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#123456",
    });
  });

  test("a child follows the colour its parent's currentcolor reads when the grandparent's changes", () => {
    registerCSS(
      `
        :root { --c: currentcolor; }
        .red { color: red; }
        .blue { color: blue; }
        .mid { color: var(--c); }
        .child { color: inherit; }
      `,
      { inlineVariables: false },
    );

    const tree = (className: string) => (
      <View className={className}>
        <View className="mid">
          <View testID="child" className="child" />
        </View>
      </View>
    );

    render(tree("red"));
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });

    screen.rerender(tree("blue"));
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#00f",
    });
  });
});
