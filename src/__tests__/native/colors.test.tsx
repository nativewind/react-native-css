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

  test("color: INITIAL is case-folded into the drop, not into the lookup", () => {
    registerCSS(`
      .parent { color: red; }
      .child { color: INITIAL; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toBeUndefined();
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

  test.each(["border-color", "background-color"])(
    "%s: inherit is dropped",
    (property) => {
      registerCSS(`
        .parent { color: red; }
        .child { ${property}: inherit; }
      `);

      render(
        <View className="parent">
          <View testID="child" className="child" />
        </View>,
      );

      expect(screen.getByTestId("child").props.style).toBeUndefined();
    },
  );

  test("background-color: unset clears an earlier rule's color", () => {
    registerCSS(`
      .filled { background-color: red; }
      .cleared { background-color: unset; }
    `);

    render(
      <>
        <View testID="filled" className="filled" />
        <View testID="cleared" className="filled cleared" />
      </>,
    );

    expect(screen.getByTestId("filled").props.style).toStrictEqual({
      backgroundColor: "#f00",
    });
    expect(screen.getByTestId("cleared").props.style).toStrictEqual({
      backgroundColor: undefined,
    });
  });

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

  test.each(["revert", "revert-layer"])(
    "color: %s publishes nothing to descendants",
    (keyword) => {
      // React Native has no cascade origins, so `revert` has no value to roll back to
      registerCSS(`
        .parent { color: red; }
        .mid { color: ${keyword}; }
        .child { color: inherit; }
      `);

      render(
        <View className="parent">
          <View testID="mid" className="mid">
            <View testID="child" className="child" />
          </View>
        </View>,
      );

      expect(screen.getByTestId("mid").props.style).toBeUndefined();
      expect(screen.getByTestId("child").props.style).toStrictEqual({
        color: "#f00",
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
  ["color-mix(in srgb, inherit, blue)", "rgba(127.5, 0, 127.5, 1)"],
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

  test.each(
    colorsThatReadTheInheritedColor.filter(
      ([, midColor]) => midColor === "#f00",
    ),
  )("a child of mid { color: %s } inherits the same color", (midColorValue) => {
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
      color: "#f00",
    });
  });
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
