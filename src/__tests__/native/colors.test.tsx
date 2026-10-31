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

// Chromium 153, Firefox 155 and WebKit 26.6 compute each colour below with an alpha of 0.5
const BROWSER_COLORS = [
  ["rgb(255 0 0)", "rgba(255, 0, 0, 0.5)"],
  ["rgb(100% 0% 0%)", "rgba(255, 0, 0, 0.5)"],
  ["rgb(51 102 153)", "rgba(51, 102, 153, 0.5)"],
  ["rgb(127.5 0 0)", "rgba(128, 0, 0, 0.5)"],
  ["rgb(50% 25% 10%)", "rgba(128, 64, 26, 0.5)"],
  ["rgb(50% 25% 75%)", "rgba(128, 64, 191, 0.5)"],
  ["rgb(300 -20 0)", "rgba(255, 0, 0, 0.5)"],
  ["hsl(120 50% 50%)", "rgba(64, 191, 64, 0.5)"],
  ["hsl(120deg 100% 25%)", "rgba(0, 128, 0, 0.5)"],
  ["hsl(0.5turn 50% 50%)", "rgba(64, 191, 191, 0.5)"],
  ["hsl(3.14159rad 50% 50%)", "rgba(64, 191, 191, 0.5)"],
  ["hsl(200grad 50% 50%)", "rgba(64, 191, 191, 0.5)"],
  ["hsl(480 50% 50%)", "rgba(64, 191, 64, 0.5)"],
  ["hsl(-120 50% 50%)", "rgba(64, 64, 191, 0.5)"],
  ["hsl(-600 100% 50%)", "rgba(0, 255, 0, 0.5)"],
  ["hsl(1e7 100% 50%)", "rgba(170, 0, 255, 0.5)"],
  ["hsl(120 150% 50%)", "rgba(0, 255, 0, 0.5)"],
  ["hsl(120 50% 120%)", "rgba(255, 255, 255, 0.5)"],
  ["hsl(120 -10% 50%)", "rgba(128, 128, 128, 0.5)"],
  ["hsl(0 84.2% 60.2%)", "rgba(239, 68, 68, 0.5)"],
  ["hsl(33.3 47.4% 11.2%)", "rgba(42, 30, 15, 0.5)"],
] as const;

// The same browsers render an infinite or NaN hue as hue 0
const NON_FINITE_HUE_COLORS = [
  ["hsl(calc(infinity) 50% 50%)", "rgba(191, 64, 64, 0.5)"],
  ["hsl(calc(-infinity) 50% 50%)", "rgba(191, 64, 64, 0.5)"],
  ["hsl(calc(NaN) 50% 50%)", "rgba(191, 64, 64, 0.5)"],
] as const;

function withAlpha(color: string, alpha: string) {
  return `${color.slice(0, -1)} / ${alpha})`;
}

function renderedBackground(id = testID) {
  const style: unknown = screen.getByTestId(id).props.style;

  return typeof style === "object" &&
    style !== null &&
    "backgroundColor" in style &&
    typeof style.backgroundColor === "string"
    ? processColor(style.backgroundColor)
    : undefined;
}

function renderInParent() {
  render(
    <View className="parent">
      <View testID={testID} className="my-class" />
    </View>,
  );
}

describe("a colour with an unresolved alpha renders what browsers compute", () => {
  test.each([...BROWSER_COLORS, ...NON_FINITE_HUE_COLORS])(
    "%s, alpha read at runtime",
    (color, expected) => {
      registerCSS(
        `.parent { --a: 0.5; } .my-class { background-color: ${withAlpha(color, "var(--a)")}; }`,
        { inlineVariables: false },
      );

      renderInParent();

      expect(renderedBackground()).toBe(processColor(expected));
    },
  );

  test.each([...BROWSER_COLORS, ...NON_FINITE_HUE_COLORS])(
    "%s, alpha read from a fallback",
    (color, expected) => {
      registerCSS(
        `.my-class { background-color: ${withAlpha(color, "var(--a, 0.5)")}; }`,
      );

      renderInParent();

      expect(renderedBackground()).toBe(processColor(expected));
    },
  );

  test.each(BROWSER_COLORS)(
    "%s, alpha folded at compile time",
    (color, expected) => {
      registerCSS(
        `.parent { --a: 0.5; } .my-class { background-color: ${withAlpha(color, "var(--a)")}; }`,
      );

      renderInParent();

      expect(renderedBackground()).toBe(processColor(expected));
    },
  );

  test.each(BROWSER_COLORS)(
    "%s, resolved at compile time",
    (color, expected) => {
      registerCSS(
        `.my-class { background-color: ${withAlpha(color, "0.5")}; }`,
      );

      renderInParent();

      expect(renderedBackground()).toBe(processColor(expected));
    },
  );

  test("the alpha is the variable's value on the element", () => {
    registerCSS(
      `.parent { --a: 0.5; } .my-class { --a: 0.25; background-color: ${withAlpha("rgb(255 0 0)", "var(--a)")}; }`,
      { inlineVariables: false },
    );

    renderInParent();

    expect(renderedBackground()).toBe(processColor("rgba(255, 0, 0, 0.25)"));
  });
});

describe("a hue the second lightningcss pass reads as a float32", () => {
  // Chromium and WebKit reduce 3e9 to 120deg; Firefox renders it as hue 0
  test("below 2 ** 32 the hue reduces", () => {
    registerCSS(
      `.my-class { background-color: ${withAlpha("hsl(3e9 100% 50%)", "var(--a, 0.5)")}; }`,
    );

    renderInParent();

    expect(renderedBackground()).toBe(processColor("rgba(0, 255, 0, 0.5)"));
  });

  test.each(["4294967296", "1e20", "1e38"])(
    "%s names no angle and renders as hue 0",
    (hue) => {
      registerCSS(`
        .my-class { background-color: ${withAlpha(`hsl(${hue} 100% 50%)`, "var(--a, 0.5)")}; }
        .resolved { background-color: hsl(${hue} 100% 50% / 0.5); }
      `);

      render(
        <>
          <View testID={testID} className="my-class" />
          <View testID="resolved" className="resolved" />
        </>,
      );

      expect(renderedBackground()).toBe(processColor("rgba(255, 0, 0, 0.5)"));
      expect(renderedBackground("resolved")).toBe(renderedBackground());
    },
  );

  // lightningcss's first pass resolves an infinite hue to an achromatic colour; browsers render hue 0
  test("lightningcss resolves calc(infinity) to black where the unresolved spelling renders hue 0", () => {
    registerCSS(`
      .resolved { background-color: hsl(calc(infinity) 100% 50%); }
      .my-class { background-color: ${withAlpha("hsl(calc(infinity) 100% 50%)", "var(--a, 1)")}; }
    `);

    render(
      <>
        <View testID="resolved" className="resolved" />
        <View testID={testID} className="my-class" />
      </>,
    );

    expect(renderedBackground("resolved")).toBe(processColor("#000"));
    expect(renderedBackground()).toBe(processColor("rgb(255, 0, 0)"));
  });
});

describe("light-dark()", () => {
  afterEach(() => {
    act(() => {
      colorScheme.set("light");
    });
  });

  test("carries an unresolved alpha into both schemes", () => {
    registerCSS(`
      :root { color-scheme: light dark; }
      .my-class {
        background-color: light-dark(
          rgb(50% 25% 10% / var(--a, 0.5)),
          hsl(120 100% 50% / var(--a, 0.5))
        );
      }
    `);

    render(<View testID={testID} className="my-class" />);

    expect(renderedBackground()).toBe(processColor("rgba(128, 64, 26, 0.5)"));

    act(() => {
      colorScheme.set("dark");
    });

    expect(renderedBackground()).toBe(processColor("rgba(0, 255, 0, 0.5)"));
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
