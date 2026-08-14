import { PixelRatio } from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

import { dimensions, reduceMotion } from "../../native/reactivity";

jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  RN.Platform.OS = "ios";
  return RN as unknown;
});

test(":root MediaQueries", () => {
  registerCSS(`
  :root {
    @media ios {
      --my-var: System;
    }
    @media android {
      --my-var: SystemAndroid;
    }
  }

  @layer utilities {
    .my-class {
      font-family: var(--my-var);
    }
  }`);

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    fontFamily: "System",
  });
});

test("color scheme", () => {
  registerCSS(`
.my-class { color: blue; }

@media (prefers-color-scheme: dark) {
  .my-class { color: red; }
}`);

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    color: "#00f",
  });

  act(() => {
    colorScheme.set("dark");
  });

  expect(component.props.style).toStrictEqual({
    color: "#f00",
  });
});

test("width (plain)", () => {
  registerCSS(`
.my-class { color: blue; }

@media (width: 500px) {
  .my-class { color: red; }
}`);

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    color: "#00f",
  });

  act(() => {
    dimensions.set({
      ...dimensions.get(),
      width: 500,
    });
  });

  expect(component.props.style).toStrictEqual({
    color: "#f00",
  });
});

test("width (range)", () => {
  registerCSS(`
.my-class { color: blue; }

@media (width = 500px) {
  .my-class { color: red; }
}`);

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    color: "#00f",
  });

  act(() => {
    dimensions.set({ ...dimensions.get(), width: 500 });
  });

  expect(component.props.style).toStrictEqual({
    color: "#f00",
  });
});

test("min-width", () => {
  registerCSS(`
.my-class { color: blue; }

@media (min-width: 500px) {
  .my-class { color: red; }
}`);

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    color: "#f00",
  });

  act(() => {
    dimensions.set({
      ...dimensions.get(),
      width: 300,
    });
  });

  expect(component.props.style).toStrictEqual({
    color: "#00f",
  });
});

test("max-width", () => {
  registerCSS(`
.my-class { color: blue; }

@media (max-width: 500px) {
  .my-class { color: red; }
}`);

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    color: "#00f",
  });

  act(() => {
    dimensions.set({
      ...dimensions.get(),
      width: 300,
    });
  });

  expect(component.props.style).toStrictEqual({
    color: "#f00",
  });
});

test("not all", () => {
  // This reads not (all and min-width: 640px)
  // It is the same as max-width: 639px
  registerCSS(`
@media not all and (min-width: 640px) {
  .my-class { background-color: red; }
}`);
  // Make larger than 640
  act(() => {
    dimensions.set({
      ...dimensions.get(),
      width: 1000,
    });
  });

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual(undefined);

  // Make smaller than 640
  act(() => {
    dimensions.set({
      ...dimensions.get(),
      width: 300,
    });
  });

  expect(component.props.style).toStrictEqual({
    backgroundColor: "#f00",
  });
});

describe("resolution", () => {
  test("dppx", () => {
    registerCSS(`
@media (resolution: 2dppx) {
  .my-class { color: red; }
}`);
    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(PixelRatio.get()).toBe(2);
    expect(component.props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("dpi", () => {
    registerCSS(`
@media (resolution: 320dpi) {
  .my-class { color: red; }
}`);
    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(PixelRatio.get()).toBe(2);
    expect(component.props.style).toStrictEqual({
      color: "#f00",
    });
  });
});

describe("min-resolution", () => {
  // PixelRatio.get() === 2
  test("dppx", () => {
    registerCSS(`
@media (min-resolution: 1dppx) {
  .my-class { color: red; }
}`);
    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("dpi", () => {
    registerCSS(`
@media (min-resolution: 160dpi) {
  .my-class { color: red; }
}`);
    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      color: "#f00",
    });
  });
});

describe("max-resolution", () => {
  // PixelRatio.get() === 2
  test("dppx", () => {
    registerCSS(`
@media (max-resolution: 1dppx) {
  .my-class { color: red; }
}`);
    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual(undefined);
  });

  test("dpi", () => {
    registerCSS(`
@media (max-resolution: 160dpi) {
  .my-class { color: red; }
}`);
    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual(undefined);
  });
});

// Outside the describe below, whose beforeEach overwrites the value before any
// assertion can see it. The documented cold-start default is motion ENABLED: the
// getter is async with no synchronous counterpart, so the first paint answers from
// this, and seeding true would suppress motion-safe: styling for every user.
test("reduceMotion defaults to false before AccessibilityInfo answers", () => {
  expect(reduceMotion.get()).toBe(false);
});

describe("prefers-reduced-motion", () => {
  // reduceMotion and colorScheme are module-global observables; reset them so
  // each test starts from a known state (motion enabled, light scheme).
  beforeEach(() => {
    act(() => {
      reduceMotion.set(false);
      colorScheme.set("light");
    });
  });

  test("reduce (motion-reduce:) — applies only when reduce motion is enabled", () => {
    registerCSS(`
.my-class { color: blue; }

@media (prefers-reduced-motion: reduce) {
  .my-class { color: red; }
}`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    // Default: motion enabled → the reduce rule does not apply.
    expect(component.props.style).toStrictEqual({ color: "#00f" });

    act(() => {
      reduceMotion.set(true);
    });
    expect(component.props.style).toStrictEqual({ color: "#f00" });

    // Reactive both ways — toggling the OS flag off restores the base style.
    act(() => {
      reduceMotion.set(false);
    });
    expect(component.props.style).toStrictEqual({ color: "#00f" });
  });

  test("no-preference (motion-safe:) — applies only when reduce motion is disabled", () => {
    registerCSS(`
.my-class { color: blue; }

@media (prefers-reduced-motion: no-preference) {
  .my-class { color: red; }
}`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    // Default: motion enabled → no-preference matches.
    expect(component.props.style).toStrictEqual({ color: "#f00" });

    act(() => {
      reduceMotion.set(true);
    });
    expect(component.props.style).toStrictEqual({ color: "#00f" });
  });

  test("composes with prefers-color-scheme via `and`", () => {
    registerCSS(`
.my-class { color: blue; }

@media (prefers-reduced-motion: reduce) and (prefers-color-scheme: dark) {
  .my-class { color: red; }
}`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({ color: "#00f" });

    // Only reduce motion — the rule still needs dark.
    act(() => {
      reduceMotion.set(true);
    });
    expect(component.props.style).toStrictEqual({ color: "#00f" });

    // Both conditions now hold.
    act(() => {
      colorScheme.set("dark");
    });
    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  test("negation — not (prefers-reduced-motion: reduce)", () => {
    registerCSS(`
.my-class { color: blue; }

@media not all and (prefers-reduced-motion: reduce) {
  .my-class { color: red; }
}`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    // Motion enabled → not(reduce) is true → the rule applies.
    expect(component.props.style).toStrictEqual({ color: "#f00" });

    act(() => {
      reduceMotion.set(true);
    });
    expect(component.props.style).toStrictEqual({ color: "#00f" });
  });

  test("bare boolean — @media (prefers-reduced-motion) is equivalent to reduce", () => {
    registerCSS(`
.my-class { color: blue; }

@media (prefers-reduced-motion) {
  .my-class { color: red; }
}`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    // Bare boolean form matches when reduce motion is enabled (CSS: bare ≡ reduce).
    expect(component.props.style).toStrictEqual({ color: "#00f" });

    act(() => {
      reduceMotion.set(true);
    });
    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  test("an unrecognised value never matches", () => {
    // The compiler emits ["=", name, value] for any value, with no allowlist, so
    // this condition is reachable. MQ5 makes an unknown value false — a two-way
    // branch on `no-preference` would alias everything else to `reduce`.
    registerCSS(`
.my-class { color: blue; }

@media (prefers-reduced-motion: bogus-value) {
  .my-class { color: red; }
}`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({ color: "#00f" });

    act(() => {
      reduceMotion.set(true);
    });
    expect(component.props.style).toStrictEqual({ color: "#00f" });
  });
});
