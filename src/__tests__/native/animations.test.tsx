import { StyleSheet } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

// Check the engine output at the Reanimated boundary. Native interpolation is
// covered by the Release renderer suite, not by a fake getAnimatedStyle helper.
jest.mock("../../native/reanimated", () => ({
  animatedComponentFamily: (component: unknown) => component,
}));
const style = () =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as
    | Record<string, unknown>
    | undefined;
const horizontal = { from: { marginLeft: "100%" }, to: { marginLeft: "0%" } };
const vertical = { from: { marginTop: "0%" }, to: { marginTop: "50%" } };
const keyframes = `@keyframes slide-in { from { margin-left: 100%; } to { margin-left: 0%; } }
  @keyframes slide-down { from { margin-top: 0%; } to { margin-top: 50%; } }`;

test("basic animation delivers keyframes and duration to Reanimated", () => {
  registerCSS(
    `${keyframes} .motion { animation-name: slide-in; animation-duration: 1s; }`,
  );
  render(<View testID={testID} className="motion" />);
  expect(style()).toMatchObject({
    animationName: [horizontal],
    animationDuration: [1000],
  });
});

test("updating animation replaces keyframes, then removes and restores them", () => {
  registerCSS(
    `${keyframes} .horizontal { animation: slide-in 1s linear; } .vertical { animation: slide-down 2s linear; }`,
  );
  render(<View testID={testID} className="horizontal" />);
  expect(style()).toMatchObject({
    animationName: [horizontal],
    animationDuration: [1000],
  });
  screen.rerender(<View testID={testID} className="vertical" />);
  expect(style()).toMatchObject({
    animationName: [vertical],
    animationDuration: [2000],
  });
  screen.rerender(<View testID={testID} />);
  expect(style()?.animationName).toBeUndefined();
  expect(style()?.animationDuration).toBeUndefined();
  screen.rerender(<View testID={testID} className="horizontal" />);
  expect(style()).toMatchObject({
    animationName: [horizontal],
    animationDuration: [1000],
  });
});

test("parsable shorthand animation preserves duration, timing, and fill", () => {
  registerCSS(
    `${keyframes} .motion { animation: slide-in 1s linear 250ms 2 alternate both; }`,
  );
  render(<View testID={testID} className="motion" />);
  expect(style()).toMatchObject({
    animationName: [horizontal],
    animationDuration: [1000],
    animationDelay: [250],
    animationIterationCount: [2],
    animationDirection: ["alternate"],
    animationFillMode: ["both"],
    animationTimingFunction: "linear",
  });
});

test.each([
  [undefined, "var(--animation-name) 1s linear"],
  [false, "var(--animation-name) 1s linear"],
  [undefined, "1s linear var(--animation-name)"],
  [false, "1s linear var(--animation-name)"],
] as const)(
  "variable shorthand animation updates with inlineVariables=%s and %s",
  (inlineVariables, shorthand) => {
    registerCSS(
      `${keyframes} .motion { animation: ${shorthand}; }
    .horizontal { --animation-name: slide-in; } .vertical { --animation-name: slide-down; }`,
      { inlineVariables },
    );
    render(<View testID={testID} className="motion horizontal" />);
    expect(style()).toMatchObject({
      animationName: horizontal,
      animationDuration: 1000,
    });
    screen.rerender(<View testID={testID} className="motion vertical" />);
    expect(style()).toMatchObject({
      animationName: vertical,
      animationDuration: 1000,
    });
  },
);
