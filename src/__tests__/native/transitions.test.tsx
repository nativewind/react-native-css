import { StyleSheet } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

// Observe the engine's transition contract before Reanimated consumes it.
// Intermediate frame and final rendering assertions belong to the native suite.
jest.mock("../../native/reanimated", () => ({
  animatedComponentFamily: (component: unknown) => component,
}));
const style = () =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as
    | Record<string, unknown>
    | undefined;
beforeEach(() =>
  registerCSS(
    `.motion { transition: width 1s linear; } .first { width: 100px; } .second { width: 200px; }`,
  ),
);

test("basic transition supplies metadata and the changed target", () => {
  render(<View testID={testID} className="motion" />);
  expect(style()).toMatchObject({
    transitionProperty: ["width"],
    transitionDuration: [1000],
    transitionDelay: [0],
    transitionTimingFunction: "linear",
  });
  expect(style()?.width).toBeUndefined();
  screen.rerender(<View testID={testID} className="motion first" />);
  expect(style()).toMatchObject({ width: 100, transitionDuration: [1000] });
});

test("updating transition target does not retain the previous value", () => {
  render(<View testID={testID} className="motion first" />);
  expect(style()?.width).toBe(100);
  screen.rerender(<View testID={testID} className="motion second" />);
  expect(style()).toMatchObject({ width: 200, transitionProperty: ["width"] });
});

test("removing a target or transition clears its fields and supports restoration", () => {
  render(<View testID={testID} className="motion first" />);
  screen.rerender(<View testID={testID} className="motion" />);
  expect(style()?.width).toBeUndefined();
  expect(style()?.transitionDuration).toEqual([1000]);
  screen.rerender(<View testID={testID} className="second" />);
  expect(style()?.width).toBe(200);
  expect(style()?.transitionProperty).toBeUndefined();
  expect(style()?.transitionDuration).toBeUndefined();
  screen.rerender(<View testID={testID} className="motion first" />);
  expect(style()).toMatchObject({ width: 100, transitionDuration: [1000] });
});
