import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

test("shadow values - single nested variables", () => {
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
        blurRadius: 25,
        color: "#fb2c36",
        offsetX: 0,
        offsetY: 20,
        spreadDistance: -5,
      },
    ],
  });
});

test("shadow values - multiple nested variables", () => {
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
        blurRadius: 0,
        color: "#f00",
        offsetX: 0,
        offsetY: 20,
        spreadDistance: 0,
      },

      {
        blurRadius: 0,
        color: "#008000",
        offsetX: 0,
        offsetY: 30,
        spreadDistance: 0,
      },
      {
        blurRadius: 0,
        color: "#800080",
        offsetX: 0,
        offsetY: 40,
        spreadDistance: 0,
      },
      {
        blurRadius: 0,
        color: "#ff0",
        offsetX: 0,
        offsetY: 50,
        spreadDistance: 0,
      },
      {
        blurRadius: 0,
        color: "#ffa500",
        offsetX: 0,
        offsetY: 60,
        spreadDistance: 0,
      },
      {
        blurRadius: 0,
        color: "#808080",
        offsetX: 0,
        offsetY: 70,
        spreadDistance: 0,
      },
    ],
  });
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

test("inset shadow via CSS variable", () => {
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

test("inset shadow via CSS variable - blur and color without spread", () => {
  // CSS parser normalizes omitted spread to 0, so this exercises the
  // [inset, offsetX, offsetY, blurRadius, spreadDistance, color] pattern
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

test("shadow values from CSS variable are resolved", () => {
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

test("@property defaults enable shadow class override", () => {
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

  expect(component.props.style.boxShadow).toHaveLength(1);
  expect(component.props.style.boxShadow[0]).toMatchObject({
    offsetX: 0,
    offsetY: 4,
    blurRadius: 6,
    spreadDistance: -1,
  });
});

test("@property defaults with currentcolor (object color)", () => {
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
