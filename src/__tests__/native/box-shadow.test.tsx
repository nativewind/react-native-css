import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

test("single shadow - basic", () => {
  registerCSS(`
    .test { box-shadow: 0 4px 6px -1px #000; }
  `);

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        spreadDistance: -1,
        color: "#000",
      },
    ],
  });
});

test("single shadow - color first", () => {
  registerCSS(`
    .test { box-shadow: #1a2b3c 0 4px 6px -1px; }
  `);

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    boxShadow: [
      {
        color: "#1a2b3c",
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        spreadDistance: -1,
      },
    ],
  });
});

test("single shadow - negative offsets", () => {
  registerCSS(`
    .test { box-shadow: -2px -4px 6px 0 #000; }
  `);

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    boxShadow: [
      {
        offsetX: -2,
        offsetY: -4,
        blurRadius: 6,
        spreadDistance: 0,
        color: "#000",
      },
    ],
  });
});

test("single shadow - blur and color without spread", () => {
  registerCSS(`
    .test { box-shadow: 0 4px 6px #000; }
  `);

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        spreadDistance: 0,
        color: "#000",
      },
    ],
  });
});

test("single shadow - without color inherits default", () => {
  registerCSS(`
    .test { box-shadow: 0 4px 6px -1px; }
  `);

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  // Shadows without explicit color inherit the default text color (__rn-css-color)
  expect(component.props.style.boxShadow).toHaveLength(1);
  expect(component.props.style.boxShadow[0]).toMatchObject({
    offsetX: 0,
    offsetY: 4,
    blurRadius: 6,
    spreadDistance: -1,
  });
  // Color is inherited from platform default (PlatformColor)
  expect(component.props.style.boxShadow[0].color).toBeDefined();
});

test("inset shadow - basic", () => {
  registerCSS(`
    .test { box-shadow: inset 0 2px 4px 0 #000; }
  `);

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    boxShadow: [
      {
        inset: true,
        offsetX: 0,
        offsetY: 2,
        blurRadius: 4,
        spreadDistance: 0,
        color: "#000",
      },
    ],
  });
});

test("inset shadow - with color first", () => {
  registerCSS(`
    .test { box-shadow: inset #fb2c36 0 0 24px 0; }
  `);

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    boxShadow: [
      {
        inset: true,
        color: "#fb2c36",
        offsetX: 0,
        offsetY: 0,
        blurRadius: 24,
        spreadDistance: 0,
      },
    ],
  });
});

test("inset shadow - without color inherits default", () => {
  registerCSS(`
    .test { box-shadow: inset 0 0 10px 5px; }
  `);

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  // Shadows without explicit color inherit the default text color (__rn-css-color)
  expect(component.props.style.boxShadow).toHaveLength(1);
  expect(component.props.style.boxShadow[0]).toMatchObject({
    inset: true,
    offsetX: 0,
    offsetY: 0,
    blurRadius: 10,
    spreadDistance: 5,
  });
  // Color is inherited from platform default (PlatformColor)
  expect(component.props.style.boxShadow[0].color).toBeDefined();
});

test("inset shadow - blur and color without spread", () => {
  registerCSS(`
    .test { box-shadow: inset 0 2px 4px #000; }
  `);

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  // CSS parser normalizes omitted spread to 0
  expect(component.props.style).toStrictEqual({
    boxShadow: [
      {
        inset: true,
        offsetX: 0,
        offsetY: 2,
        blurRadius: 4,
        spreadDistance: 0,
        color: "#000",
      },
    ],
  });
});

test("mixed inset and regular shadows", () => {
  registerCSS(`
    .test { box-shadow: 0 4px 6px -1px #000, inset 0 2px 4px 0 #fff; }
  `);

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        spreadDistance: -1,
        color: "#000",
      },
      {
        inset: true,
        offsetX: 0,
        offsetY: 2,
        blurRadius: 4,
        spreadDistance: 0,
        color: "#fff",
      },
    ],
  });
});

describe("shadow values from CSS variables", () => {
  test("single nested variable", () => {
    registerCSS(`
      :root {
        --color: #fb2c36;
        --my-var: 0 20px 25px -5px var(--color);
      }

      .test { box-shadow: var(--my-var); }
    `);

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      boxShadow: [
        {
          offsetX: 0,
          offsetY: 20,
          blurRadius: 25,
          spreadDistance: -5,
          color: "#fb2c36",
        },
      ],
    });
  });

  test("multiple nested variables", () => {
    registerCSS(`
      :root {
        --my-var: 0 20px 0 0 red, 0 30px 0 0 green;
        --my-var-2: var(--my-var), 0 40px 0 0 purple;
        --my-var-3: 0 50px 0 0 yellow, 0 60px 0 0 orange;
        --my-var-4: var(--my-var-3), 0 70px 0 0 gray;
      }

      .test {
        box-shadow: var(--my-var-2), var(--my-var-4);
      }
    `);

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      boxShadow: [
        {
          offsetX: 0,
          offsetY: 20,
          blurRadius: 0,
          spreadDistance: 0,
          color: "#f00",
        },
        {
          offsetX: 0,
          offsetY: 30,
          blurRadius: 0,
          spreadDistance: 0,
          color: "#008000",
        },
        {
          offsetX: 0,
          offsetY: 40,
          blurRadius: 0,
          spreadDistance: 0,
          color: "#800080",
        },
        {
          offsetX: 0,
          offsetY: 50,
          blurRadius: 0,
          spreadDistance: 0,
          color: "#ff0",
        },
        {
          offsetX: 0,
          offsetY: 60,
          blurRadius: 0,
          spreadDistance: 0,
          color: "#ffa500",
        },
        {
          offsetX: 0,
          offsetY: 70,
          blurRadius: 0,
          spreadDistance: 0,
          color: "#808080",
        },
      ],
    });
  });

  test("multi-definition variable (theme switching)", () => {
    registerCSS(`
      :root { --themed-shadow: 0 4px 6px -1px #000; }
      .dark { --themed-shadow: 0 4px 6px -1px #fff; }
      .test { box-shadow: var(--themed-shadow); }
    `);

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.boxShadow).toStrictEqual([
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        spreadDistance: -1,
        color: "#000",
      },
    ]);
  });

  test("inset shadow", () => {
    registerCSS(`
      :root { --my-shadow: inset 0 2px 4px 0 #000; }
      .test { box-shadow: var(--my-shadow); }
    `);

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      boxShadow: [
        {
          inset: true,
          offsetX: 0,
          offsetY: 2,
          blurRadius: 4,
          spreadDistance: 0,
          color: "#000",
        },
      ],
    });
  });

  test("inset shadow - blur and color without spread", () => {
    // CSS parser normalizes omitted spread to 0
    registerCSS(`
      :root { --my-shadow: inset 0 2px 4px #000; }
      .test { box-shadow: var(--my-shadow); }
    `);

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      boxShadow: [
        {
          inset: true,
          offsetX: 0,
          offsetY: 2,
          blurRadius: 4,
          spreadDistance: 0,
          color: "#000",
        },
      ],
    });
  });

  // Compile-time path: lightningcss inlines the variable and processes the
  // value through its CSS parser. The shorthand handler converts to native
  // format without filtering — transparent shadows pass through as-is.
  test("transparent shadow is preserved", () => {
    registerCSS(`
      :root {
        --my-shadow: 0 0 0 0 #0000;
      }
      .test { box-shadow: var(--my-shadow); }
    `);

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      boxShadow: [
        {
          offsetX: 0,
          offsetY: 0,
          blurRadius: 0,
          spreadDistance: 0,
          color: "#0000",
        },
      ],
    });
  });
});

describe("shadow values from runtime variables", () => {
  test("single shadow", () => {
    registerCSS(
      `.test {
        --my-shadow: 0 4px 6px -1px #000;
        box-shadow: var(--my-shadow);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.boxShadow).toStrictEqual([
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        spreadDistance: -1,
        color: "#000",
      },
    ]);
  });

  test("single shadow - color first", () => {
    registerCSS(
      `.test {
        --my-shadow: #1a2b3c 0 4px 6px -1px;
        box-shadow: var(--my-shadow);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.boxShadow).toStrictEqual([
      {
        color: "#1a2b3c",
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        spreadDistance: -1,
      },
    ]);
  });

  test("single shadow - negative offsets", () => {
    registerCSS(
      `.test {
        --my-shadow: -2px -4px 6px 0 #000;
        box-shadow: var(--my-shadow);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.boxShadow).toStrictEqual([
      {
        offsetX: -2,
        offsetY: -4,
        blurRadius: 6,
        spreadDistance: 0,
        color: "#000",
      },
    ]);
  });

  test("single shadow - blur and color without spread", () => {
    registerCSS(
      `.test {
        --my-shadow: 0 4px 6px #000;
        box-shadow: var(--my-shadow);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.boxShadow).toStrictEqual([
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        color: "#000",
      },
    ]);
  });

  test("single shadow - without color", () => {
    registerCSS(
      `.test {
        --my-shadow: 0 4px 6px -1px;
        box-shadow: var(--my-shadow);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    // Runtime path has no default color injection (compile-time adds currentcolor)
    expect(component.props.style.boxShadow).toStrictEqual([
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        spreadDistance: -1,
      },
    ]);
  });

  // Runtime path: variables resolve at runtime, so the shorthand handler
  // processes the raw values. Transparent shadows (e.g., Tailwind v4's
  // @property --tw-inset-shadow { initial-value: 0 0 0 0 #0000 }) are
  // filtered out to avoid creating invisible native shadow objects that
  // the renderer would still process. This is intentionally different
  // from the compile-time path which preserves them.
  test("transparent shadow is filtered", () => {
    registerCSS(
      `.test {
        --my-shadow: 0 0 0 0 #0000;
        box-shadow: var(--my-shadow);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.boxShadow).toStrictEqual([]);
  });

  test("inset shadow", () => {
    registerCSS(
      `.test {
        --my-shadow: inset 0 2px 4px 0 #000;
        box-shadow: var(--my-shadow);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.boxShadow).toStrictEqual([
      {
        inset: true,
        offsetX: 0,
        offsetY: 2,
        blurRadius: 4,
        spreadDistance: 0,
        color: "#000",
      },
    ]);
  });

  test("inset shadow - color first", () => {
    registerCSS(
      `.test {
        --my-shadow: inset #fb2c36 0 0 24px 0;
        box-shadow: var(--my-shadow);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.boxShadow).toStrictEqual([
      {
        inset: true,
        color: "#fb2c36",
        offsetX: 0,
        offsetY: 0,
        blurRadius: 24,
        spreadDistance: 0,
      },
    ]);
  });

  test("inset shadow - without color has broken color parsing (known limitation)", () => {
    registerCSS(
      `.test {
        --my-shadow: inset 0 0 10px 5px;
        box-shadow: var(--my-shadow);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    // TODO: Known bug — runtime shorthand handler pattern-matches the flat
    // array and places "inset" string in the color slot. The compile-time
    // path (via lightningcss CSS parser) correctly identifies the inset
    // keyword and inherits platform default color. This only affects inset
    // shadows without an explicit color, which is uncommon in practice.
    expect(component.props.style.boxShadow).toStrictEqual([
      {
        color: "inset",
        offsetX: 0,
        offsetY: 0,
        blurRadius: 10,
        spreadDistance: 5,
      },
    ]);
  });

  test("inset shadow - blur and color without spread", () => {
    registerCSS(
      `.test {
        --my-shadow: inset 0 2px 4px #000;
        box-shadow: var(--my-shadow);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.boxShadow).toStrictEqual([
      {
        inset: true,
        offsetX: 0,
        offsetY: 2,
        blurRadius: 4,
        color: "#000",
      },
    ]);
  });

  test("mixed inset and regular shadows", () => {
    registerCSS(
      `.test {
        --shadows: 0 4px 6px -1px #000, inset 0 2px 4px 0 #fff;
        box-shadow: var(--shadows);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.boxShadow).toStrictEqual([
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        spreadDistance: -1,
        color: "#000",
      },
      {
        inset: true,
        offsetX: 0,
        offsetY: 2,
        blurRadius: 4,
        spreadDistance: 0,
        color: "#fff",
      },
    ]);
  });

  test("multi-shadow from separate variables", () => {
    registerCSS(
      `.test {
        --shadow-a: 0 4px 6px -1px #000;
        --shadow-b: 0 1px 2px 0 #333;
        box-shadow: var(--shadow-a), var(--shadow-b);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.boxShadow).toStrictEqual([
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        spreadDistance: -1,
        color: "#000",
      },
      {
        offsetX: 0,
        offsetY: 1,
        blurRadius: 2,
        spreadDistance: 0,
        color: "#333",
      },
    ]);
  });

  test("multi-shadow from single variable", () => {
    registerCSS(
      `.test {
        --shadows: 0 4px 6px -1px #000, 0 1px 2px 0 #333;
        box-shadow: var(--shadows);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.boxShadow).toStrictEqual([
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        spreadDistance: -1,
        color: "#000",
      },
      {
        offsetX: 0,
        offsetY: 1,
        blurRadius: 2,
        spreadDistance: 0,
        color: "#333",
      },
    ]);
  });

  test("multi-shadow with transparent filtering", () => {
    registerCSS(
      `.test {
        --visible: 0 4px 6px -1px #000;
        --transparent: 0 0 0 0 transparent;
        box-shadow: var(--visible), var(--transparent);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    // Transparent shadow should be filtered out
    expect(component.props.style.boxShadow).toStrictEqual([
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        spreadDistance: -1,
        color: "#000",
      },
    ]);
  });
});

describe("@property defaults with shadow variables", () => {
  test("transparent defaults are filtered", () => {
    registerCSS(`
      @property --my-shadow {
        syntax: "*";
        inherits: false;
        initial-value: 0 0 #0000;
      }
      @property --my-ring {
        syntax: "*";
        inherits: false;
        initial-value: 0 0 #0000;
      }

      .test {
        --my-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        box-shadow: var(--my-ring), var(--my-shadow);
      }
    `);

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.boxShadow).toStrictEqual([
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        spreadDistance: -1,
        color: "#0000001a",
      },
    ]);
  });

  test("currentcolor resolves to platform color object", () => {
    registerCSS(`
      @property --my-shadow {
        syntax: "*";
        inherits: false;
        initial-value: 0 0 #0000;
      }
      @property --my-ring {
        syntax: "*";
        inherits: false;
        initial-value: 0 0 #0000;
      }

      .test {
        --my-ring: 0 0 0 2px currentcolor;
        box-shadow: var(--my-shadow), var(--my-ring);
      }
    `);

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.boxShadow).toHaveLength(1);
    expect(component.props.style.boxShadow[0]).toMatchObject({
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadDistance: 2,
    });
    // currentcolor resolves to a platform color object, not a string
    expect(typeof component.props.style.boxShadow[0].color).toBe("object");
  });

  test("three vars with two transparent (Tailwind ring pattern)", () => {
    registerCSS(`
      @property --tw-ring-offset-shadow {
        syntax: "*";
        inherits: false;
        initial-value: 0 0 #0000;
      }
      @property --tw-ring-shadow {
        syntax: "*";
        inherits: false;
        initial-value: 0 0 #0000;
      }
      @property --tw-shadow {
        syntax: "*";
        inherits: false;
        initial-value: 0 0 #0000;
      }

      .test {
        --tw-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);
      }
    `);

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    // Two transparent shadows filtered, only the visible one remains
    expect(component.props.style.boxShadow).toStrictEqual([
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        spreadDistance: -1,
        color: "#0000001a",
      },
    ]);
  });

  test("three vars with two transparent via runtime variables", () => {
    registerCSS(
      `
      @property --tw-ring-offset-shadow {
        syntax: "*";
        inherits: false;
        initial-value: 0 0 #0000;
      }
      @property --tw-ring-shadow {
        syntax: "*";
        inherits: false;
        initial-value: 0 0 #0000;
      }
      @property --tw-shadow {
        syntax: "*";
        inherits: false;
        initial-value: 0 0 #0000;
      }

      .test {
        --tw-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);
      }
    `,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.boxShadow).toStrictEqual([
      {
        offsetX: 0,
        offsetY: 10,
        blurRadius: 15,
        spreadDistance: -3,
        color: "#0000001a",
      },
    ]);
  });
});
