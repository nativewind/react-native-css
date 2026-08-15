import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

import { dimensions } from "../../native/reactivity";

/**
 * MQ5 § 3.1 gives a term the runtime cannot decide the value `unknown`, and
 * "the negation of unknown is unknown". Two-valued logic answers `false`
 * instead, and `not false` is `true` - so every negated term this runtime
 * cannot measure applies to everything.
 */

function renderAt(css: string, width: number, height: number) {
  registerCSS(css);
  render(<View testID={testID} className="my-class" />);

  act(() => {
    dimensions.set({ ...dimensions.get(), width, height });
  });

  return screen.getByTestId(testID);
}

const base = `.my-class { color: red; }`;

describe("a negated term the runtime cannot measure does not apply", () => {
  test("not (monochrome: 1) - a feature with no runtime value", () => {
    const component = renderAt(
      `${base}
       @media not (monochrome: 1) { .my-class { color: blue; } }`,
      500,
      1000,
    );

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  test("not (fictional-feature: 3) - an unknown <mf-name>", () => {
    const component = renderAt(
      `${base}
       @media not (fictional-feature: 3) { .my-class { color: blue; } }`,
      500,
      1000,
    );

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  test("not (fictional-thing) - MQ5's <general-enclosed>", () => {
    const component = renderAt(
      `${base}
       @media not (fictional-thing) { .my-class { color: blue; } }`,
      500,
      1000,
    );

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  test("not (aspect-ratio: 3/4) - an operand with no compile-time value", () => {
    // The ratio does not compile, so the operand is `null`. lightningcss folds
    // `not` into the operator for a range feature, but a plain equality keeps
    // it, so this is where a null operand meets a negation.
    const component = renderAt(
      `${base}
       @media not (aspect-ratio: 3/4) { .my-class { color: blue; } }`,
      500,
      1000,
    );

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  test("not (color-gamut: srgb) - a non-numeric operand on an unmeasurable feature", () => {
    const component = renderAt(
      `${base}
       @media not (color-gamut: srgb) { .my-class { color: blue; } }`,
      500,
      1000,
    );

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  test("not all and (width > 10em) - an operand no compile-time length can resolve", () => {
    // `em` is relative to the element's own font size, so the compiler cannot
    // fold it and emits the length descriptor `[{}, "em", 10, 1]` in the
    // operand slot - from ordinary, valid CSS. The comparison has a measurable
    // left-hand side and a right-hand side it cannot order, which is unknown
    // rather than false.
    //
    // The negation has to come from the query's `not` qualifier rather than
    // from `not (width > 10em)`, because lightningcss folds that spelling into
    // `(width <= 10em)` and the term arrives with no negation left to observe.
    const component = renderAt(
      `${base}
       @media not all and (width > 10em) { .my-class { color: blue; } }`,
      500,
      1000,
    );

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  test("not (400px < width < 500px) - an interval the runtime does not evaluate", () => {
    const component = renderAt(
      `${base}
       @media not (400px < width < 500px) { .my-class { color: blue; } }`,
      450,
      1000,
    );

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });
});

describe("an unmeasurable term does not rescue a conjunction or a disjunction", () => {
  test("(min-width: 100px) and (monochrome: 1) does not apply", () => {
    const component = renderAt(
      `${base}
       @media (min-width: 100px) and (monochrome: 1) { .my-class { color: blue; } }`,
      500,
      1000,
    );

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  test("(min-width: 100px) or (monochrome: 1) applies on the measurable operand", () => {
    const component = renderAt(
      `${base}
       @media (min-width: 100px) or (monochrome: 1) { .my-class { color: blue; } }`,
      500,
      1000,
    );

    expect(component.props.style).toStrictEqual({ color: "#00f" });
  });

  test("(min-width: 999px) or (monochrome: 1) does not apply", () => {
    const component = renderAt(
      `${base}
       @media (min-width: 999px) or (monochrome: 1) { .my-class { color: blue; } }`,
      500,
      1000,
    );

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });
});

describe("negation of a term the runtime CAN measure is untouched", () => {
  test("not (min-width: 9999px) applies on a narrow screen", () => {
    const component = renderAt(
      `${base}
       @media not (min-width: 9999px) { .my-class { color: blue; } }`,
      500,
      1000,
    );

    expect(component.props.style).toStrictEqual({ color: "#00f" });
  });

  test("not (min-width: 100px) does not apply on a wide screen", () => {
    const component = renderAt(
      `${base}
       @media not (min-width: 100px) { .my-class { color: blue; } }`,
      500,
      1000,
    );

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  test("not (prefers-color-scheme: dark) applies in light mode", () => {
    const component = renderAt(
      `${base}
       @media not (prefers-color-scheme: dark) { .my-class { color: blue; } }`,
      500,
      1000,
    );

    expect(component.props.style).toStrictEqual({ color: "#00f" });
  });
});
