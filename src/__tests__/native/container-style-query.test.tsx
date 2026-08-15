import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

/**
 * `style()` container queries are not implemented. CSS Conditional 5 § 3 makes
 * an unsupported container feature `unknown` for that element, and MQ5 § 3.1
 * makes `unknown` false in the two-valued context of a conditional group rule.
 *
 * Dropping the term instead is a different answer: an absent condition applies
 * inside every container, and a dropped operand turns `true and unknown` into
 * `true`.
 */

const parentID = "parent";
const childID = "child";

function renderContainer(css: string, width: number, height: number) {
  registerCSS(css);

  render(
    <View testID={parentID} className="container">
      <View testID={childID} className="child" />
    </View>,
  );

  fireEvent(screen.getByTestId(parentID), "layout", {
    nativeEvent: { layout: { width, height } },
  });

  return screen.getByTestId(childID);
}

const base = `
.container { container-name: my-container; }
.child { color: red; }
`;

test("style() alone never matches", () => {
  const child = renderContainer(
    `${base}
     @container style(--foo: bar) { .child { color: blue; } }`,
    500,
    200,
  );

  expect(child).toHaveStyle({ color: "#f00" });
});

test("`and style()` never matches, even when the other operand does", () => {
  const child = renderContainer(
    `${base}
     @container (min-width: 100px) and style(--foo: bar) { .child { color: blue; } }`,
    500,
    200,
  );

  // true and unknown is unknown, which is false here.
  expect(child).toHaveStyle({ color: "#f00" });
});

test("`or style()` matches on the operand that is true", () => {
  const child = renderContainer(
    `${base}
     @container (min-width: 100px) or style(--foo: bar) { .child { color: blue; } }`,
    500,
    200,
  );

  // true or unknown is true.
  expect(child).toHaveStyle({ color: "#00f" });
});

test("`or style()` does not match when the other operand is false", () => {
  const child = renderContainer(
    `${base}
     @container (min-width: 999px) or style(--foo: bar) { .child { color: blue; } }`,
    500,
    200,
  );

  // false or unknown is unknown, which is false here.
  expect(child).toHaveStyle({ color: "#f00" });
});

test("`not style()` never matches", () => {
  const child = renderContainer(
    `${base}
     @container not style(--foo: bar) { .child { color: blue; } }`,
    500,
    200,
  );

  // The negation of unknown is unknown, not true.
  expect(child).toHaveStyle({ color: "#f00" });
});

/**
 * `style()` is not the only container term with no answer. A negation over any
 * of these must not turn the refusal into a match.
 */
describe("other undecidable container terms are unknown, not false", () => {
  test("(aspect-ratio: 2) - a ratio has no compile-time value, so it is refused", () => {
    // The container's aspect ratio is measured; it is the right-hand side that
    // never arrives, because `parseMediaFeatureValue` has no `ratio` case.
    const child = renderContainer(
      `${base}
       @container (aspect-ratio: 2) { .child { color: blue; } }`,
      400,
      200,
    );

    expect(child).toHaveStyle({ color: "#f00" });
  });

  test("not (aspect-ratio: 3/4) - an operand with no compile-time value", () => {
    const child = renderContainer(
      `${base}
       @container not (aspect-ratio: 3/4) { .child { color: blue; } }`,
      500,
      200,
    );

    expect(child).toHaveStyle({ color: "#f00" });
  });

  test("not (block-size: 100px) - a feature the runtime cannot measure", () => {
    const child = renderContainer(
      `${base}
       @container not (block-size: 100px) { .child { color: blue; } }`,
      500,
      200,
    );

    expect(child).toHaveStyle({ color: "#f00" });
  });

  test("not (inline-size > 100px) - an unmeasurable feature in a range", () => {
    const child = renderContainer(
      `${base}
       @container not (inline-size > 100px) { .child { color: blue; } }`,
      500,
      200,
    );

    expect(child).toHaveStyle({ color: "#f00" });
  });

  test("not (400px < width < 500px) - an interval the runtime does not evaluate", () => {
    const child = renderContainer(
      `${base}
       @container not (400px < width < 500px) { .child { color: blue; } }`,
      450,
      200,
    );

    expect(child).toHaveStyle({ color: "#f00" });
  });
});

/**
 * A single negation cannot tell Kleene's `not unknown === unknown` apart from
 * JavaScript's `!"unknown" === false`: both reach the two-valued boundary as
 * false. A second negation separates them - `not not unknown` is still
 * unknown, while `!!"unknown"` is true - and a container condition is where
 * the pair survives, since lightningcss folds `not not` away for @media but
 * keeps it here.
 */
test("`not (not style())` never matches either", () => {
  const child = renderContainer(
    `${base}
     @container not (not style(--foo: bar)) { .child { color: blue; } }`,
    500,
    200,
  );

  expect(child).toHaveStyle({ color: "#f00" });
});
