import type { ComponentType } from "react";
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

test("an unresolved animation name is omitted and a later variable restores it", () => {
  registerCSS(
    `${keyframes} .motion { animation-name: var(--animation-name); animation-duration: 1s; }
    .horizontal { --animation-name: slide-in; }`,
    { inlineVariables: false },
  );
  render(<View testID={testID} className="motion" />);
  expect(style()?.animationName).toBeUndefined();
  screen.rerender(<View testID={testID} className="motion horizontal" />);
  expect(style()).toMatchObject({ animationName: horizontal });
  screen.rerender(<View testID={testID} className="motion" />);
  expect(style()?.animationName).toBeUndefined();
});

test("animation name variables retain a keyframe fallback and none", () => {
  registerCSS(
    `${keyframes} .motion { animation-name: var(--animation-name, slide-in); }
    .stopped { --animation-name: none; }`,
    { inlineVariables: false },
  );
  render(<View testID={testID} className="motion" />);
  expect(style()).toMatchObject({ animationName: horizontal });
  screen.rerender(<View testID={testID} className="motion stopped" />);
  expect(style()?.animationName).toBe("none");
  screen.rerender(<View testID={testID} className="motion" />);
  expect(style()).toMatchObject({ animationName: horizontal });
});

test("an invalid numeric animation name is omitted without throwing", () => {
  registerCSS(
    `.motion { animation-name: var(--animation-name); --animation-name: 12px; }`,
    { inlineVariables: false },
  );
  render(<View testID={testID} className="motion" />);
  expect(style()?.animationName).toBeUndefined();
});

test("multiple animation names preserve keyframe order and timing metadata", () => {
  registerCSS(`${keyframes} .motion {
    animation: slide-in 1s linear 250ms 2 alternate both,
      slide-down 2s ease-in 500ms infinite reverse forwards;
  }`);
  render(<View testID={testID} className="motion" />);
  expect(style()).toMatchObject({
    animationName: [horizontal, vertical],
    animationDuration: [1000, 2000],
    animationDelay: [250, 500],
    animationIterationCount: [2, "infinite"],
    animationDirection: ["alternate", "reverse"],
    animationFillMode: ["both", "forwards"],
    animationTimingFunction: ["linear", "ease-in"],
  });
});

test("multiple keyframe selectors retain their distinct percentage positions", () => {
  registerCSS(`@keyframes pause { 0%, 50% { opacity: 0; } 100% { opacity: 1; } }
    .motion { animation: pause 2s linear; }`);
  render(<View testID={testID} className="motion" />);
  expect(style()).toMatchObject({
    animationName: [{ "0%, 50%": { opacity: 0 }, "1": { opacity: 1 } }],
  });
});

test("advanced timing resolves through the installed Reanimated CSS API", () => {
  registerCSS(`${keyframes} .motion {
    animation: slide-in 1s cubic-bezier(0.2, 0.4, 0.6, 0.8);
    transition: opacity 2s steps(4, jump-end);
  }`);
  render(<View testID={testID} className="motion" />);
  // Check the actual installed CSS timing constructors. LightningCSS uses
  // float32 coordinates and canonicalizes jump-end to its end alias.
  const { cubicBezier, steps } = jest.requireActual<
    typeof import("react-native-reanimated")
  >("react-native-reanimated");
  expect(style()?.animationTimingFunction).toEqual(
    cubicBezier(
      Math.fround(0.2),
      Math.fround(0.4),
      Math.fround(0.6),
      Math.fround(0.8),
    ),
  );
  expect(style()?.transitionTimingFunction).toEqual(steps(4, "end"));
});

test("the Reanimated wrapper is cached by original component identity", () => {
  const { animatedComponentFamily } = jest.requireActual<
    typeof import("../../native/reanimated")
  >("../../native/reanimated");
  const native =
    jest.requireActual<typeof import("react-native")>("react-native");
  const wrapped = animatedComponentFamily(native.View);
  expect(wrapped).not.toBe(native.View);
  expect(animatedComponentFamily(native.View)).toBe(wrapped);
  expect(animatedComponentFamily(native.Text)).not.toBe(wrapped);
});

test.each(["View", "Text", "Image", "ScrollView", "FlatList"] as const)(
  "an existing Reanimated %s keeps its identity",
  (name) => {
    const { animatedComponentFamily } = jest.requireActual<
      typeof import("../../native/reanimated")
    >("../../native/reanimated");
    const Animated = jest.requireActual<
      typeof import("react-native-reanimated")
    >("react-native-reanimated").default;
    const component = Animated[name] as unknown as ComponentType;
    expect(animatedComponentFamily(component)).toBe(component);
  },
);

test("a regular component with the same display name still receives a wrapper", () => {
  const { animatedComponentFamily } = jest.requireActual<
    typeof import("../../native/reanimated")
  >("../../native/reanimated");
  const Animated = jest.requireActual<typeof import("react-native-reanimated")>(
    "react-native-reanimated",
  ).default;
  const Regular = () => null;
  Regular.displayName = (Animated.View as { displayName?: string }).displayName;
  expect(animatedComponentFamily(Regular)).not.toBe(Regular);
});
