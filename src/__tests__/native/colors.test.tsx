import { processColor } from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

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

describe("unresolved alpha", () => {
  test("rgb with number channels", () => {
    registerCSS(`.my-class {
      background-color: rgb(255 0 0 / var(--a, 0.5));
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      backgroundColor: "rgba(255, 0, 0, 0.5)",
    });
  });

  test("rgb with percentage channels", () => {
    registerCSS(`.my-class {
      background-color: rgb(50% 25% 10% / var(--a, 0.5));
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      backgroundColor: "rgba(128, 64, 26, 0.5)",
    });
  });

  // The resolved path compiles the same channels to `#ef4444`, and React Native
  // rejects both `hsl()` carrying an alpha and `hsla()` missing one.
  test("hsl resolves to the same channels as the resolved path", () => {
    registerCSS(`.my-class {
      background-color: hsl(0 84.2% 60.2% / var(--a, 0.5));
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      backgroundColor: "rgba(239, 68, 68, 0.5)",
    });
  });

  // lightningcss clamps saturation, lightness and every rgb channel, so the hue
  // is the only channel a non-finite `calc()` reaches the compiler through.
  test("hsl with a non-finite hue", () => {
    registerCSS(`.my-class {
      background-color: hsl(calc(NaN) 100% 50% / var(--a, 0.5));
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      backgroundColor: "rgba(255, 0, 0, 0.5)",
    });
  });

  test("light-dark carries an unresolved alpha into both schemes", () => {
    registerCSS(`.my-class {
      background-color: light-dark(
        rgb(50% 25% 10% / var(--a, 0.5)),
        hsl(120 100% 50% / var(--a, 0.5))
      );
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      backgroundColor: "rgba(128, 64, 26, 0.5)",
    });

    act(() => {
      colorScheme.set("dark");
    });

    expect(component.props.style).toStrictEqual({
      backgroundColor: "rgba(0, 255, 0, 0.5)",
    });
  });

  afterEach(() => {
    act(() => {
      colorScheme.set("light");
    });
  });
});

// `parseColor` compiles a fully resolved colour and `parseUnresolvedColor`
// compiles the same channels with the alpha left open. An opaque fallback makes
// the two spellings the same colour, so React Native has to read one number
// from both.
describe("unresolved alpha matches the resolved spelling", () => {
  function renderedColor(id: string) {
    const style: unknown = screen.getByTestId(id).props.style;

    return typeof style === "object" &&
      style !== null &&
      "backgroundColor" in style &&
      typeof style.backgroundColor === "string"
      ? processColor(style.backgroundColor)
      : undefined;
  }

  const colors = [
    "rgb(255 0 0)",
    "rgb(100% 0% 0%)",
    "rgb(50% 25% 10%)",
    "hsl(0 84.2% 60.2%)",
    "hsl(120 100% 50%)",
    "hsl(calc(NaN) 100% 50%)",
  ] as const;

  test.each(colors)("%s", (color) => {
    registerCSS(`
      .resolved { background-color: ${color}; }
      .unresolved { background-color: ${color.slice(0, -1)} / var(--a, 1)); }
    `);

    render(
      <>
        <View testID="resolved" className="resolved" />
        <View testID="unresolved" className="unresolved" />
      </>,
    );

    const expected = renderedColor("resolved");

    // A colour React Native rejects reads as `undefined`, which would make the
    // comparison below pass while neither spelling renders anything.
    expect(typeof expected).toBe("number");

    expect(renderedColor("unresolved")).toBe(expected);
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
