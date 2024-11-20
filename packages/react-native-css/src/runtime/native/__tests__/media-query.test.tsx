/** @jsxImportSource react-native-css */
import { PixelRatio, View } from "react-native";

import {
  act,
  registerCSS,
  render,
  screen,
  setupAllComponents,
  testID,
} from "react-native-css/jest";

import { colorScheme } from "../api";
import { dimensions, vw } from "../globals";

setupAllComponents();

test("color scheme", () => {
  registerCSS(`
.my-class { color: blue; }

@media (prefers-color-scheme: dark) {
  .my-class { color: red; }
}`);

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component).toHaveStyle({
    color: "#0000ff",
  });

  act(() => {
    colorScheme.set("dark");
  });

  expect(component).toHaveStyle({
    color: "#ff0000",
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

  expect(component).toHaveStyle({
    color: "#0000ff",
  });

  act(() => {
    dimensions.set({
      ...dimensions.get(),
      width: 500,
    });
  });

  expect(component).toHaveStyle({
    color: "#ff0000",
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

  expect(component).toHaveStyle({
    color: "#0000ff",
  });

  act(() => {
    dimensions.set({
      ...dimensions.get(),
      width: 500,
    });
  });

  expect(component).toHaveStyle({
    color: "#ff0000",
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

  expect(component).toHaveStyle({
    color: "#ff0000",
  });

  act(() => {
    dimensions.set({
      ...dimensions.get(),
      width: 300,
    });
  });

  expect(component).toHaveStyle({
    color: "#0000ff",
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

  expect(component).toHaveStyle({
    color: "#0000ff",
  });

  act(() => {
    dimensions.set({
      ...dimensions.get(),
      width: 300,
    });
  });

  expect(component).toHaveStyle({
    color: "#ff0000",
  });
});

test("not all", () => {
  // This reads not (all and min-width: 640px)
  // It is the same as max-width: 639px
  registerCSS(`
@media not all and (min-width: 640px) {
  .my-class { color: red; }
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

  expect(component).toHaveStyle(undefined);

  // Make smaller than 640
  act(() => {
    dimensions.set({
      ...dimensions.get(),
      width: 300,
    });
  });

  expect(component).toHaveStyle({
    color: "#ff0000",
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
    expect(component).toHaveStyle({
      color: "#ff0000",
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
    expect(component).toHaveStyle({
      color: "#ff0000",
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

    expect(component).toHaveStyle({
      color: "#ff0000",
    });
  });

  test("dpi", () => {
    registerCSS(`
@media (min-resolution: 160dpi) {
  .my-class { color: red; }
}`);
    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component).toHaveStyle({
      color: "#ff0000",
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

    expect(component).toHaveStyle(undefined);
  });

  test("dpi", () => {
    registerCSS(`
@media (max-resolution: 160dpi) {
  .my-class { color: red; }
}`);
    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component).toHaveStyle(undefined);
  });
});
