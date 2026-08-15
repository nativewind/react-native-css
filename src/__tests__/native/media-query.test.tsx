import { PixelRatio } from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

import {
  COMPARISON_MATCHES,
  ORDERINGS,
  sizeComparisons,
  type Ordering,
  type SizeFeature,
} from "../_media-features";
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

/**
 * Renders `.my-class` under a viewport of `size` and reports whether the
 * `@media <prelude>` rule won.
 *
 * `.my-class` is blue outside the query and red inside it, so the returned
 * colour is a direct reading of the condition's verdict, and a class that
 * resolved to nothing at all cannot read as a non-match.
 */
function mediaQueryMatches(
  prelude: string,
  size: { width: number; height: number },
): boolean {
  registerCSS(`
.my-class { color: blue; }

@media ${prelude} {
  .my-class { color: red; }
}`);

  act(() => {
    dimensions.set({ ...dimensions.get(), ...size });
  });

  render(<View testID={testID} className="my-class" />);

  return screen.getByTestId(testID).props.style.color === "#f00";
}

/**
 * One viewport for every size comparison, with the two axes holding different
 * numbers so a feature answered off the wrong axis produces a wrong verdict
 * rather than the right one by coincidence.
 */
const VIEWPORT = { width: 600, height: 400 };

/**
 * A threshold on each side of the measured value, and one exactly on it, per
 * axis. The two axes draw from disjoint sets of numbers for the same reason
 * the viewport is not square.
 */
const THRESHOLDS: Record<SizeFeature, Record<Ordering, number>> = {
  width: {
    "measured < threshold": 700,
    "measured === threshold": 600,
    "measured > threshold": 500,
  },
  height: {
    "measured < threshold": 450,
    "measured === threshold": 400,
    "measured > threshold": 350,
  },
};

describe("size comparisons", () => {
  /**
   * The identical census the `@container` runtime table is built from.
   *
   * One primitive now decides a range comparison for both at-rules, so the two
   * are held to the same table — an operator that means one thing under
   * `@media` and another under `@container` is the drift that primitive
   * exists to make impossible, and only a shared table can observe it.
   */
  const cases: [prelude: string, ordering: Ordering, matches: boolean][] =
    sizeComparisons().flatMap((row) => {
      return ORDERINGS.map(
        (ordering): [prelude: string, ordering: Ordering, matches: boolean] => {
          return [
            row.condition(THRESHOLDS[row.feature][ordering]),
            ordering,
            COMPARISON_MATCHES[row.operator][ordering],
          ];
        },
      );
    });

  test("the table covers the whole census", () => {
    expect(cases).toHaveLength(sizeComparisons().length * ORDERINGS.length);
    expect(cases.length).toBeGreaterThan(0);
  });

  test.each(cases)(
    "@media %s (%s) against a 600x400 viewport matches: %s",
    (prelude, _ordering, matches) => {
      expect(mediaQueryMatches(prelude, VIEWPORT)).toBe(matches);
    },
  );
});

test("each size axis is measured on its own axis", () => {
  // Stated differentially, so it holds whatever the numbers are: on a
  // landscape viewport the same threshold cannot satisfy both axes.
  expect(mediaQueryMatches("(width > 500px)", VIEWPORT)).toBe(true);
  expect(mediaQueryMatches("(height > 500px)", VIEWPORT)).toBe(false);
});

describe("a block whose condition is absent", () => {
  /**
   * The other side of the distinction the uncompilable table below pins. These
   * preludes carry no condition at all, so the block applies at every size —
   * a compiler that read "there is no condition" as "the condition did not
   * compile" would drop them instead, and nothing else here would notice.
   *
   * `not print` reads `not (print and ...)`, which is true on every non-print
   * device whatever the rest of the query says, so it applies below its own
   * width bound as well as above it.
   */
  const cases: [prelude: string, width: number][] = [
    ["all", 300],
    ["all", 600],
    ["screen", 300],
    ["screen", 600],
    ["not print and (width > 400px)", 300],
    ["not print and (width > 400px)", 600],
  ];

  test.each(cases)("@media %s applies at %dpx wide", (prelude, width) => {
    expect(mediaQueryMatches(prelude, { ...VIEWPORT, width })).toBe(true);
  });
});

describe("a media query list with one uncompilable branch", () => {
  /**
   * The branch that did not compile contributes nothing, and the branch that
   * did keeps its own condition — the block does not become unconditional
   * because one of its queries was refused.
   */
  const prelude = "(width > env(safe-area-inset-top)), (width > 400px)";

  test.each([
    [600, true],
    [300, false],
  ])("at %dpx wide matches: %s", (width, matches) => {
    expect(mediaQueryMatches(prelude, { ...VIEWPORT, width })).toBe(matches);
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
