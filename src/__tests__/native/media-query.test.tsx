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

describe("aspect-ratio", () => {
  /**
   * The viewport's aspect ratio is its width over its height, measured off the
   * same two observables `width` and `height` already read.
   */
  const cases: [
    prelude: string,
    size: { width: number; height: number },
    matches: boolean,
  ][] = [
    ["(aspect-ratio > 1)", { width: 400, height: 200 }, true],
    ["(aspect-ratio > 1)", { width: 200, height: 400 }, false],
    ["(aspect-ratio: 2/1)", { width: 400, height: 200 }, true],
    ["(aspect-ratio: 2/1)", { width: 300, height: 300 }, false],
    ["(min-aspect-ratio: 2/1)", { width: 400, height: 200 }, true],
    ["(min-aspect-ratio: 2/1)", { width: 399, height: 200 }, false],
  ];

  test.each(cases)(
    "@media %s against a %o viewport matches: %s",
    (prelude, size, matches) => {
      registerCSS(`
@media ${prelude} {
  .my-class { color: red; }
}`);

      act(() => {
        dimensions.set({ ...dimensions.get(), ...size });
      });

      render(<View testID={testID} className="my-class" />);

      expect(screen.getByTestId(testID).props.style).toStrictEqual(
        matches ? { color: "#f00" } : undefined,
      );
    },
  );
});

describe("interval (range pair) conditions", () => {
  /**
   * A 600x200 viewport, so both bounds of an interval on either axis can be
   * placed on either side of the measured value.
   */
  const cases: [prelude: string, matches: boolean][] = [
    ["(400px < width < 800px)", true],
    ["(400px < width < 500px)", false],
    ["(600px < width < 800px)", false],
    ["(600px <= width < 800px)", true],
    ["(800px > width > 400px)", true],
    ["(100px < height < 300px)", true],
    ["(100px < height < 200px)", false],
  ];

  test.each(cases)(
    "@media %s against a 600x200 viewport matches: %s",
    (prelude, matches) => {
      registerCSS(`
@media ${prelude} {
  .my-class { color: red; }
}`);

      act(() => {
        dimensions.set({ ...dimensions.get(), width: 600, height: 200 });
      });

      render(<View testID={testID} className="my-class" />);

      expect(screen.getByTestId(testID).props.style).toStrictEqual(
        matches ? { color: "#f00" } : undefined,
      );
    },
  );
});

describe("a condition the compiler cannot evaluate", () => {
  /**
   * A `@media` block the compiler cannot compile a condition for must not
   * reach the runtime at all. The failure mode this pins is not a missed match
   * but the reverse: a block emitted with no condition applies to every
   * element that carries the class, at every viewport size.
   */
  const cases: [label: string, prelude: string][] = [
    ["an unresolvable feature value", "(width > env(safe-area-inset-top))"],
    [
      "a negated unresolvable feature value",
      "not (width > env(safe-area-inset-top))",
    ],
  ];

  test.each(cases)("@media %s never matches", (_label, prelude) => {
    registerCSS(`
@media ${prelude} {
  .my-class { color: red; }
}`);

    render(<View testID={testID} className="my-class" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual(undefined);
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
