import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

test("color-mix() - keyword", () => {
  registerCSS(
    `.test {
      --bg: red;
      @supports (color: color-mix(in lab, red, red)) {
        background-color: color-mix(in oklab, var(--bg) 50%, transparent);
      }
    }
  `,
    {
      inlineVariables: false,
    },
  );

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    backgroundColor: "rgba(255, 0, 0, 0.5)",
  });
});

test("color-mix() - oklch", () => {
  registerCSS(
    `.test {
      --bg:  oklch(0.577 0.245 27.325);
      @supports (color: color-mix(in lab, red, red)) {
        background-color: color-mix(in oklab, var(--bg) 50%, transparent);
      }
    }
  `,
    {
      inlineVariables: false,
    },
  );

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    backgroundColor: "rgba(231, 0, 11, 0.5)",
  });
});

test("color-mix() - black with transparent (NaN oklab channels)", () => {
  // lightningcss resolves this at compile time to oklab(0 NaN NaN / 0.5):
  // black is oklab [l=0, a=0, b=0] and transparent has no chromaticity, so the
  // a/b channels degenerate to NaN. Without coercing NaN to 0 the color
  // serializes to "#NaNNaNNaN80", which React Native silently discards.
  // This is what Tailwind's `bg-black/50` compiles to.
  registerCSS(
    `.test {
      background-color: color-mix(in oklab, #000 50%, transparent);
    }
  `,
  );

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    backgroundColor: "#00000080",
  });
});

// Independent sRGB channel arithmetic, including normalized weights and original alpha.
test.each([
  ["25%, var(--right)", [63.75, 0, 191.25, 1]],
  [", var(--right) 25%", [191.25, 0, 63.75, 1]],
  [", var(--right)", [127.5, 0, 127.5, 1]],
  ["20%, var(--right) 20%", [127.5, 0, 127.5, 0.4]],
  ["80%, var(--right) 80%", [127.5, 0, 127.5, 1]],
  [", transparent 75%", [255, 0, 0, 0.25]],
  ["25%, transparent 25%", [255, 0, 0, 0.25]],
] as const)(
  "dynamic color-mix uses weights rather than replacing alpha: %s",
  (tail, expected) => {
    registerCSS(
      `.test { --left: red; --right: blue; background-color: color-mix(in srgb, var(--left) ${tail}); }`,
      { inlineVariables: false },
    );
    render(<View testID={testID} className="test" />);
    const color = screen.getByTestId(testID).props.style
      ?.backgroundColor as string;
    expect(color).toMatch(/^rgba\(/);
    const channels = color.slice(5, -1).split(",").map(Number);
    expected.forEach((value, index) => {
      expect(channels[index]).toBeCloseTo(value, 6);
    });
  },
);

test("mixing an already translucent color preserves its alpha and restores changes", () => {
  registerCSS(
    `.test { background-color: color-mix(in srgb, var(--left) 50%, transparent); }
    .half { --left: #ff000080; } .full { --left: red; }`,
    { inlineVariables: false },
  );
  const tree = (state: string) => (
    <View testID={testID} className={`test ${state}`} />
  );
  render(tree("half"));
  for (const [state, expected] of [
    ["half", 128 / 255 / 2],
    ["full", 0.5],
    ["half", 128 / 255 / 2],
  ] as const) {
    screen.rerender(tree(state));
    const color = screen.getByTestId(testID).props.style
      .backgroundColor as string;
    expect(Number(color.slice(5, -1).split(",")[3])).toBeCloseTo(expected, 6);
  }
});
