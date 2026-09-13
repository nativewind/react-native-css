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
  // is the only channel an out-of-range `calc()` reaches the compiler through.
  // It arrives as a 32-bit float, and past 2**32 one step of that grid covers
  // more than a turn, so the value no longer names an angle. Each row below is a
  // different way of landing past it and they all compile to one colour.
  test.each([
    "calc(NaN)", // serialized past the float range, reparses to Infinity
    "calc(infinity)", // reparses saturated, at 9223372036854776000
    "calc(-infinity)",
    "4294967296", // 2**32, where one step of the grid first covers a turn
    "1e20", // saturates too, arriving as 9223369837831520000
    "1e38", // the same value: past the ceiling the hue is no longer carried
  ])("hsl with a hue the float grid cannot name: %s", (hue) => {
    registerCSS(`.my-class {
      background-color: hsl(${hue} 100% 50% / var(--a, 0.5));
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      backgroundColor: "rgba(255, 0, 0, 0.5)",
    });
  });

  // The other side of that boundary: a hue far outside [0, 360) but still on a
  // part of the grid that resolves finer than a turn is reduced, never clamped.
  //
  // Every row has to land on a colour the clamp does NOT also produce, or it
  // cannot tell reduction from clamping — a hue that reduces to 0 agrees with
  // the clamp and passes either way. `3e9` is also what bounds the threshold
  // from below: it sits between 2**31 and 2**32, where the float32 ULP is 256
  // and so still finer than a turn, and it arrives exactly because one
  // significant digit survives any serializer. Together with the 2**32 row
  // above it brackets `SMALLEST_UNNAMEABLE_HUE` to within a factor of two.
  test.each([
    ["-600", "rgba(0, 255, 0, 0.5)"],
    ["3e9", "rgba(0, 255, 0, 0.5)"],
    ["1e7", "rgba(170, 0, 255, 0.5)"],
  ])("hsl reduces a large nameable hue: %s", (hue, expected) => {
    registerCSS(`.my-class {
      background-color: hsl(${hue} 100% 50% / var(--a, 0.5));
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      backgroundColor: expected,
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
    "hsl(-600 100% 50%)",
    "hsl(1e7 100% 50%)",
    "hsl(calc(NaN) 100% 50%)",
    "hsl(4294967296 100% 50%)",
    "hsl(1e20 100% 50%)",
    "hsl(1e38 100% 50%)",
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

  // `calc(infinity)` stands for a family, not a special case: sampling f32 hues
  // above 2**32, about one in seven resolves to something other than the red the
  // compiler emits, `5e10`, `1e12`, `1.44e38` and `calc(-infinity)` among them.
  //
  // What makes the family unmatchable is not that lightningcss is erratic — it
  // is that the distinguishing information never reaches this compiler.
  // Seventeen authored hues from `1e19` to `9223372036854775807` all arrive as
  // the single value `9223369837831520000`, and lightningcss's resolved path
  // splits that one arriving value twelve red to five black. No function of the
  // hue this compiler receives can separate inputs it receives as one number.
  //
  // So the compiler emits the answer that IS a function of the arriving hue and
  // the divergence is pinned here rather than reproduced. This goes red if
  // lightningcss stabilises, which is when the row belongs in the list above.
  test("a saturated hue diverges from lightningcss's own resolution", () => {
    registerCSS(`
      .resolved { background-color: hsl(calc(infinity) 100% 50%); }
      .unresolved { background-color: hsl(calc(infinity) 100% 50% / var(--a, 1)); }
    `);

    render(
      <>
        <View testID="resolved" className="resolved" />
        <View testID="unresolved" className="unresolved" />
      </>,
    );

    expect(renderedColor("resolved")).toBe(processColor("#000"));
    expect(renderedColor("unresolved")).toBe(processColor("rgb(255, 0, 0)"));
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
