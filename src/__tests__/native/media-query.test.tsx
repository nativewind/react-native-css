import { PixelRatio } from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

import { dimensions } from "../../native/reactivity";

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

describe("comma-separated media query lists", () => {
  test("apply when only the first query matches", () => {
    registerCSS(`
@media (min-width: 100px), (min-width: 9999px) {
  .my-class { color: red; }
}`);

    act(() => {
      dimensions.set({ ...dimensions.get(), width: 500 });
    });

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  test("apply when only the last query matches", () => {
    registerCSS(`
@media (min-width: 9999px), (min-width: 100px) {
  .my-class { color: red; }
}`);

    act(() => {
      dimensions.set({ ...dimensions.get(), width: 500 });
    });

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  test("do not apply when no query matches", () => {
    registerCSS(`
@media (min-width: 9999px), (max-width: 10px) {
  .my-class { color: red; }
}`);

    act(() => {
      dimensions.set({ ...dimensions.get(), width: 500 });
    });

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual(undefined);
  });

  test("react to a query becoming true", () => {
    registerCSS(`
.my-class { color: blue; }

@media (min-width: 9999px), (min-height: 400px) {
  .my-class { color: red; }
}`);

    act(() => {
      dimensions.set({ ...dimensions.get(), width: 500, height: 100 });
    });

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({ color: "#00f" });

    act(() => {
      dimensions.set({ ...dimensions.get(), width: 500, height: 500 });
    });

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });
});

describe("unresolvable operands", () => {
  test("an orientation the compiler could not resolve never matches", () => {
    registerCSS(`
.my-class { color: blue; }

@media ((orientation: env(safe-area-inset-top)) and (min-width: 0px)) {
  .my-class { color: red; }
}`);

    act(() => {
      dimensions.set({ ...dimensions.get(), width: 500, height: 1000 });
    });

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({ color: "#00f" });
  });

  test("a hover value the compiler could not resolve never matches", () => {
    registerCSS(`
.my-class { color: blue; }

@media ((hover: env(safe-area-inset-top)) and (min-width: 0px)) {
  .my-class { color: red; }
}`);

    act(() => {
      dimensions.set({ ...dimensions.get(), width: 500, height: 1000 });
    });

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({ color: "#00f" });
  });

  test("a resolved orientation still matches", () => {
    registerCSS(`
.my-class { color: blue; }

@media ((orientation: portrait) and (min-width: 0px)) {
  .my-class { color: red; }
}`);

    act(() => {
      dimensions.set({ ...dimensions.get(), width: 500, height: 1000 });
    });

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });
});

describe("boolean features", () => {
  test("height matches when the viewport has one", () => {
    registerCSS(`
.my-class { color: blue; }

@media (height) {
  .my-class { color: red; }
}`);

    act(() => {
      dimensions.set({ ...dimensions.get(), width: 500, height: 1000 });
    });

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  test("width does not match a viewport of zero width", () => {
    registerCSS(`
.my-class { color: blue; }

@media (width) {
  .my-class { color: red; }
}`);

    act(() => {
      dimensions.set({ ...dimensions.get(), width: 0, height: 1000 });
    });

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({ color: "#00f" });
  });

  test("hover matches, because the runtime always reports hover", () => {
    registerCSS(`
.my-class { color: blue; }

@media (hover) {
  .my-class { color: red; }
}`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  test("a feature the runtime cannot answer does not match", () => {
    registerCSS(`
.my-class { color: blue; }

@media (color) {
  .my-class { color: red; }
}`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({ color: "#00f" });
  });
});
