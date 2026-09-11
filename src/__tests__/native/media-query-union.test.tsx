import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

import { dimensions } from "../../native/reactivity";

jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  RN.Platform.OS = "ios";
  return RN as unknown;
});

test.each([
  ["(min-width: 500px), (max-width: 100px)", [37, 10, 37, 37]],
  ["screen, (min-width: 500px)", [37, 37, 37, 37]],
  ["not android", [37, 37, 37, 37]],
  ["not ios", [10, 10, 10, 10]],
  ["not all", [10, 10, 10, 10]],
  ["print", [10, 10, 10, 10]],
  ["not print and (min-width: 500px)", [37, 37, 37, 37]],
  ["(aspect-ratio: 100/1)", [10, 10, 10, 10]],
  ["(min-width: 100px) and (aspect-ratio: 100/1)", [10, 10, 10, 10]],
])("media query preserves conditional semantics: %s", (condition, expected) => {
  registerCSS(`
    .child { width: 10px; }
    @media ${condition} { .child { width: 37px; } }
  `);
  render(<View testID="child" className="child" />);
  for (const [index, width] of [50, 200, 700, 50].entries()) {
    act(() => {
      dimensions.set({ ...dimensions.get(), width, height: 200 });
    });
    expect(screen.getByTestId("child")).toHaveStyle({ width: expected[index] });
  }
});

test("nested alternatives retain outer media constraints and variable updates", () => {
  registerCSS(`
    :root { --size: 10px; }
    @media (min-width: 200px) {
      @media (max-width: 100px), (min-width: 500px) {
        :root { --size: 37px; }
      }
    }
    .child { width: var(--size); }
  `);
  render(<View testID="child" className="child" />);
  for (const [width, expected] of [
    [50, 10],
    [200, 10],
    [700, 37],
    [50, 10],
  ] as const) {
    act(() => {
      dimensions.set({ ...dimensions.get(), width, height: 200 });
    });
    expect(screen.getByTestId("child")).toHaveStyle({ width: expected });
  }
});
