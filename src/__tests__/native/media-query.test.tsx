import { PixelRatio } from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme, reducedMotion } from "react-native-css/runtime";

import { resetBetweenTests } from "../../jest/reset";
import { deviceReducedMotion, dimensions } from "../../native/reactivity";

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

describe("a reduced-motion preference AccessibilityInfo has not answered", () => {
  let answered: ReturnType<typeof deviceReducedMotion.get>;

  beforeEach(() => {
    answered = deviceReducedMotion.get();
    deviceReducedMotion.set(undefined);
  });

  afterEach(() => {
    act(() => {
      deviceReducedMotion.set(answered);
    });
  });

  test("a mounted view takes the device's answer when it arrives", () => {
    registerCSS(`
  .my-class { color: #000000; }
  @media (prefers-reduced-motion: reduce) { .my-class { color: #020202; } }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);
    expect(component.props.style).toStrictEqual({ color: "#000" });

    act(() => {
      deviceReducedMotion.set("reduce");
    });
    expect(component.props.style).toStrictEqual({ color: "#020202" });
  });

  test.each([
    "(prefers-reduced-motion: reduce)",
    "(prefers-reduced-motion: no-preference)",
    "(prefers-reduced-motion)",
  ])("leaves @media %s unmatched", (query) => {
    registerCSS(
      `.my-class { color: #000000; } @media ${query} { .my-class { color: #010101; } }`,
    );

    render(<View testID={testID} className="my-class" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      color: "#000",
    });
  });

  test("a mounted view follows the reduced-motion preference as it changes", () => {
    registerCSS(`
  .my-class { color: #000000; }
  @media (prefers-reduced-motion: no-preference) { .my-class { color: #010101; } }
  @media (prefers-reduced-motion: reduce) { .my-class { color: #020202; } }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);
    expect(component.props.style).toStrictEqual({ color: "#000" });

    act(() => {
      reducedMotion.set("no-preference");
    });
    expect(component.props.style).toStrictEqual({ color: "#010101" });

    act(() => {
      reducedMotion.set("reduce");
    });
    expect(component.props.style).toStrictEqual({ color: "#020202" });

    act(() => {
      reducedMotion.set("no-preference");
    });
    expect(component.props.style).toStrictEqual({ color: "#010101" });
  });
});

test("reducedMotion.set holds through a change of the device's setting, and set(null) follows the device again", () => {
  registerCSS(`
.my-class { color: #000000; }
@media (prefers-reduced-motion: reduce) { .my-class { color: #020202; } }`);
  const answered = deviceReducedMotion.get();

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  try {
    act(() => {
      reducedMotion.set("no-preference");
      deviceReducedMotion.set("reduce");
    });
    expect(reducedMotion.get()).toBe("no-preference");
    expect(component.props.style).toStrictEqual({ color: "#000" });

    act(() => {
      reducedMotion.set(null);
    });
    expect(reducedMotion.get()).toBe("reduce");
    expect(component.props.style).toStrictEqual({ color: "#020202" });
  } finally {
    act(() => {
      deviceReducedMotion.set(answered);
    });
  }
});

test("reducedMotion.set overrides the device's preference, and set(null) follows the device again at once", () => {
  registerCSS(`
.my-class { color: #000000; }
@media (prefers-reduced-motion: reduce) { .my-class { color: #020202; } }`);

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);
  expect(reducedMotion.get()).toBe("no-preference");
  expect(component.props.style).toStrictEqual({ color: "#000" });

  act(() => {
    reducedMotion.set("reduce");
  });
  expect(reducedMotion.get()).toBe("reduce");
  expect(component.props.style).toStrictEqual({ color: "#020202" });

  act(() => {
    reducedMotion.set(null);
  });
  expect(reducedMotion.get()).toBe("no-preference");
  expect(component.props.style).toStrictEqual({ color: "#000" });
});

describe("the react-native-css/jest reset", () => {
  test("clears a test's override", () => {
    reducedMotion.set("reduce");
    expect(reducedMotion.get()).toBe("reduce");

    resetBetweenTests();

    expect(reducedMotion.get()).toBe("no-preference");
  });

  test("puts a device a test changed back to AccessibilityInfo's answer", () => {
    deviceReducedMotion.set("reduce");
    expect(reducedMotion.get()).toBe("reduce");

    resetBetweenTests();

    expect(reducedMotion.get()).toBe("no-preference");
  });
});

// Chromium 153, Firefox 155 and WebKit 26.6 agree on every row: [query, reduce/light, reduce/dark, no-preference/light, no-preference/dark]
const BROWSER_MEDIA_ROWS = [
  ["(prefers-reduced-motion: reduce)", true, true, false, false],
  ["(prefers-reduced-motion: no-preference)", false, false, true, true],
  ["(prefers-reduced-motion)", true, true, false, false],
  ["not (prefers-reduced-motion)", false, false, true, true],
  ["(prefers-reduced-motion: bogus)", false, false, false, false],
  ["not all and (prefers-reduced-motion: reduce)", false, false, true, true],
  [
    "(prefers-reduced-motion: reduce) and (min-width: 1px)",
    true,
    true,
    false,
    false,
  ],
  [
    "(prefers-reduced-motion: reduce) and (prefers-color-scheme: dark)",
    false,
    true,
    false,
    false,
  ],
  [
    "(prefers-reduced-motion: reduce), (prefers-color-scheme: dark)",
    true,
    true,
    false,
    true,
  ],
  ["not (prefers-reduced-motion: reduce)", false, false, true, true],
  ["(prefers-color-scheme: dark)", false, true, false, true],
  ["(unknown-feature)", false, false, false, false],
] as const;

const MEDIA_STATES = [
  ["reduce", "light"],
  ["reduce", "dark"],
  ["no-preference", "light"],
  ["no-preference", "dark"],
] as const;

describe.each(BROWSER_MEDIA_ROWS)(
  "@media %s matches as browsers match it",
  (query, ...matches) => {
    test.each(
      MEDIA_STATES.map(
        ([motion, scheme], index) => [motion, scheme, matches[index]] as const,
      ),
    )("under %s motion in the %s scheme: %s", (motion, scheme, expected) => {
      act(() => {
        reducedMotion.set(motion);
        colorScheme.set(scheme);
      });
      registerCSS(
        `.my-class { color: #000000; } @media ${query} { .my-class { color: #010101; } }`,
      );

      render(<View testID={testID} className="my-class" />);

      expect(screen.getByTestId(testID).props.style).toStrictEqual({
        color: expected ? "#010101" : "#000",
      });
    });
  },
);
