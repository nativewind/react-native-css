import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

describe("filter: drop-shadow()", () => {
  test("basic drop-shadow", () => {
    registerCSS(`
      .test { filter: drop-shadow(0 4px 6px #000); }
    `);

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    // drop-shadow uses standardDeviation (not blurRadius) to match
    // React Native's DropShadowValue type
    expect(component.props.style.filter).toStrictEqual([
      {
        dropShadow: {
          offsetX: 0,
          offsetY: 4,
          standardDeviation: 6,
          color: "#000",
        },
      },
    ]);
  });

  test("drop-shadow with color first", () => {
    registerCSS(`
      .test { filter: drop-shadow(#fb2c36 0 0 24px); }
    `);

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.filter).toStrictEqual([
      {
        dropShadow: {
          color: "#fb2c36",
          offsetX: 0,
          offsetY: 0,
          standardDeviation: 24,
        },
      },
    ]);
  });

  test("drop-shadow without blur", () => {
    registerCSS(`
      .test { filter: drop-shadow(2px 4px #000); }
    `);

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.filter).toStrictEqual([
      {
        dropShadow: {
          offsetX: 2,
          offsetY: 4,
          standardDeviation: 0,
          color: "#000",
        },
      },
    ]);
  });

  test("drop-shadow from CSS variable", () => {
    registerCSS(`
      :root { --my-shadow: 0 4px 6px #000; }
      .test { filter: drop-shadow(var(--my-shadow)); }
    `);

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.filter).toStrictEqual([
      {
        dropShadow: {
          offsetX: 0,
          offsetY: 4,
          standardDeviation: 6,
          color: "#000",
        },
      },
    ]);
  });

  test("drop-shadow from runtime variable", () => {
    registerCSS(
      `.test {
        --my-shadow: 0 4px 6px #000;
        filter: drop-shadow(var(--my-shadow));
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.filter).toStrictEqual([
      {
        dropShadow: {
          offsetX: 0,
          offsetY: 4,
          standardDeviation: 6,
          color: "#000",
        },
      },
    ]);
  });

  test("drop-shadow with currentcolor resolves to PlatformColor", () => {
    registerCSS(
      `.test {
        --my-shadow: 0 4px 6px currentcolor;
        filter: drop-shadow(var(--my-shadow));
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    // currentcolor resolves to a PlatformColor object — requires
    // "color" type (not "string") in the shorthand handler pattern
    expect(component.props.style.filter).toStrictEqual([
      {
        dropShadow: {
          offsetX: 0,
          offsetY: 4,
          standardDeviation: 6,
          color: { semantic: ["label", "labelColor"] },
        },
      },
    ]);
  });

  test("Tailwind v4 drop-shadow pattern with @property", () => {
    registerCSS(`
      @property --tw-drop-shadow { syntax: "*"; inherits: false; }
      :root { --drop-shadow-md: 0 3px 3px rgb(0 0 0 / 0.12); }
      .test {
        --tw-drop-shadow: drop-shadow(var(--drop-shadow-md));
        filter: var(--tw-drop-shadow);
      }
    `);

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style.filter).toStrictEqual([
      {
        dropShadow: {
          offsetX: 0,
          offsetY: 3,
          standardDeviation: 3,
          color: "#0000001f",
        },
      },
    ]);
  });
});

describe("filter: opacity()", () => {
  test("opacity function produces correct key", () => {
    registerCSS(`
      @property --tw-opacity { syntax: "*"; inherits: false; }
      .test {
        --tw-opacity: opacity(0.5);
        filter: var(--tw-opacity);
      }
    `);

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    // Must produce { opacity: 0.5 }, not { hueRotate: 0.5 }
    expect(component.props.style.filter).toStrictEqual([{ opacity: 0.5 }]);
  });
});
