import { fireEvent, render, screen } from "@testing-library/react-native";
import type { MediaFeatureComparison } from "react-native-css/compiler";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

import {
  COMPARISON_MATCHES,
  ORDERINGS,
  sizeComparisons,
  type Ordering,
  type SizeFeature,
} from "../_media-features";

const parentID = "parent";
const childID = "child";

test("Unnamed containers", () => {
  registerCSS(`
    :root, :host {
      --color-white: #fff;
    }
    .\\@container {
      container-type: inline-size;
    }
    .\\@sm\\:text-white {
      @container (width >= 24rem) {
        color: var(--color-white);
      }
    }
  `);

  render(
    <View testID={parentID} className="@container">
      <View testID={childID} className="@sm:text-white" />
    </View>,
  );

  const parent = screen.getByTestId(parentID);
  const child = screen.getByTestId(childID);

  expect(child).toHaveStyle(undefined);

  // Jest does not fire layout events, so we need to manually
  fireEvent(parent, "layout", {
    nativeEvent: {
      layout: {
        width: 500,
        height: 200,
      },
    },
  });

  expect(child).toHaveStyle({ color: "#fff" });
});

test("container query width", () => {
  registerCSS(`
      .container {
        container-name: my-container;
        width: 200px;
      }

      .child {
        color: red;
      }

      @container (width > 400px) {
        .child {
          color: blue;
        }
      }
    `);

  render(
    <View testID={parentID} className="container">
      <View testID={childID} className="child" />
    </View>,
  );

  const parent = screen.getByTestId(parentID);
  const child = screen.getByTestId(childID);

  expect(parent.props.style).toStrictEqual({
    width: 200,
  });

  expect(child.props.style).toStrictEqual({
    color: "#f00",
  });

  fireEvent(parent, "layout", {
    nativeEvent: {
      layout: {
        width: 200,
        height: 200,
      },
    },
  });

  expect(child.props.style).toStrictEqual({
    color: "#f00",
  });

  screen.rerender(
    <View testID={parentID} className="container" style={{ width: 500 }}>
      <View testID={childID} className="child" />
    </View>,
  );

  fireEvent(parent, "layout", {
    nativeEvent: {
      layout: {
        width: 500,
        height: 200,
      },
    },
  });

  expect(parent.props.style).toStrictEqual({ width: 500 });

  expect(child.props.style).toStrictEqual({
    color: "#00f",
  });
});

/**
 * Renders `.child` inside a container laid out at `width` x `height`, and
 * reports whether the `@container <condition>` rule won.
 *
 * `.child` is red outside the query and blue inside it, so the returned colour
 * is a direct reading of the condition's verdict.
 *
 * The condition is written out in full, parentheses included, because a
 * parenthesised size query is only one of the forms `<container-condition>`
 * accepts — `style(--foo: bar)` and a leading container name are not
 * expressible by a helper that adds the parentheses itself.
 */
function containerQueryMatches(
  condition: string,
  { width, height }: { width: number; height: number },
): boolean {
  registerCSS(`
    .container {
      container-type: size;
    }

    .child {
      color: red;
    }

    @container ${condition} {
      .child {
        color: blue;
      }
    }
  `);

  render(
    <View testID={parentID} className="container">
      <View testID={childID} className="child" />
    </View>,
  );

  const parent = screen.getByTestId(parentID);
  const child = screen.getByTestId(childID);

  fireEvent(parent, "layout", {
    nativeEvent: { layout: { width, height } },
  });

  return child.props.style.color === "#00f";
}

/**
 * One container for every size comparison, laid out so the two axes hold
 * different numbers — a feature answered off the wrong axis then produces a
 * wrong verdict rather than the right one by coincidence.
 */
const CONTAINER = { width: 400, height: 200 };

/**
 * A threshold on each side of the measured value, and one exactly on it, per
 * axis. The two axes draw from disjoint sets of numbers for the same reason
 * the container is not square.
 */
const THRESHOLDS: Record<SizeFeature, Record<Ordering, number>> = {
  width: {
    "measured < threshold": 500,
    "measured === threshold": 400,
    "measured > threshold": 300,
  },
  height: {
    "measured < threshold": 250,
    "measured === threshold": 200,
    "measured > threshold": 150,
  },
};

describe("size comparisons", () => {
  /**
   * Every comparison operator, on both axes, in both spellings, with the
   * measured value on each side of the threshold and exactly on it.
   *
   * Two thirds of this table is where a copy-pasted operator arm hides — two
   * of the five operators always agree somewhere, and `>=` and `>` differ only
   * on the row an author writes `min-width` for. The verdicts come from the
   * shared census, so this table and the primitive's own cannot disagree about
   * what an operator means.
   */
  const cases: [
    condition: string,
    ordering: Ordering,
    matches: boolean,
    operator: MediaFeatureComparison,
  ][] = sizeComparisons().flatMap((row) => {
    return ORDERINGS.map(
      (
        ordering,
      ): [
        condition: string,
        ordering: Ordering,
        matches: boolean,
        operator: MediaFeatureComparison,
      ] => {
        return [
          row.condition(THRESHOLDS[row.feature][ordering]),
          ordering,
          COMPARISON_MATCHES[row.operator][ordering],
          row.operator,
        ];
      },
    );
  });

  test("every operator in the census reaches this table", () => {
    // Against `COMPARISON_MATCHES`, whose keys are the operator union itself,
    // rather than against the length of the generator these cases came from —
    // that product holds for any census, an empty one included.
    expect(cases.length).toBeGreaterThan(0);
    expect(new Set(cases.map(([, , , operator]) => operator))).toStrictEqual(
      new Set(Object.keys(COMPARISON_MATCHES)),
    );
  });

  test.each(cases)(
    "@container %s (%s) against a 400x200 container matches: %s",
    (condition, _ordering, matches) => {
      expect(containerQueryMatches(condition, CONTAINER)).toBe(matches);
    },
  );
});

test("each size axis is measured on its own axis", () => {
  // Stated differentially, so it holds whatever the numbers are: on a
  // landscape container the same threshold cannot satisfy both axes, and a
  // height feature answered with the container's width would make it.
  expect(containerQueryMatches("(width > 300px)", CONTAINER)).toBe(true);
  expect(containerQueryMatches("(height > 300px)", CONTAINER)).toBe(false);
});

describe("logical size features", () => {
  /**
   * `inline-size` and `block-size` are the axes under React Native's single
   * writing mode, so they are the physical ones: inline is horizontal, block
   * vertical. `container-type: inline-size` names the first of them, which
   * makes `(min-inline-size: …)` the most ordinary container query there is.
   *
   * Stated differentially as well as absolutely: on a landscape container one
   * threshold cannot satisfy both axes, so an axis answered off the other one
   * cannot pass this table by picking convenient numbers.
   */
  const cases: [condition: string, matches: boolean][] = [
    ["(min-inline-size: 400px)", true],
    ["(min-inline-size: 500px)", false],
    ["(max-inline-size: 400px)", true],
    ["(inline-size > 300px)", true],
    ["(min-block-size: 200px)", true],
    ["(min-block-size: 300px)", false],
    ["(block-size > 300px)", false],
    ["(400px < inline-size < 800px)", false],
    ["(300px < inline-size < 800px)", true],
  ];

  test.each(cases)(
    "@container %s against a 400x200 container matches: %s",
    (condition, matches) => {
      expect(containerQueryMatches(condition, CONTAINER)).toBe(matches);
    },
  );
});

describe("aspect ratio", () => {
  /**
   * A container's aspect ratio is its width over its height, so every case
   * names the container it is measured against — the 400x200 landscape one is
   * exactly 2, the 200x400 portrait one exactly 0.5, and 300x300 exactly 1.
   *
   * The two verdicts are not interchangeable here. Reintroduce the defect this
   * table exists for — an `aspect-ratio` value the compiler will not resolve —
   * and only the `matches: true` rows redden, because the block is refused and
   * never reaches the runtime. The `matches: false` rows are what catches the
   * opposite failure, a block kept but emitted with no condition at all, which
   * is what an unresolved value produces wherever it is not refused.
   */
  const cases: [
    condition: string,
    size: { width: number; height: number },
    matches: boolean,
  ][] = [
    ["(aspect-ratio > 1)", { width: 400, height: 200 }, true],
    ["(aspect-ratio > 1)", { width: 200, height: 400 }, false],
    ["(aspect-ratio > 1)", { width: 300, height: 300 }, false],
    ["(aspect-ratio < 1)", { width: 200, height: 400 }, true],
    ["(aspect-ratio < 1)", { width: 400, height: 200 }, false],
    ["(aspect-ratio: 2/1)", { width: 400, height: 200 }, true],
    ["(aspect-ratio: 2/1)", { width: 300, height: 300 }, false],
    ["(min-aspect-ratio: 2/1)", { width: 400, height: 200 }, true],
    ["(min-aspect-ratio: 2/1)", { width: 399, height: 200 }, false],
    ["(max-aspect-ratio: 2/1)", { width: 400, height: 200 }, true],
    ["(max-aspect-ratio: 2/1)", { width: 401, height: 200 }, false],
  ];

  test.each(cases)(
    "@container %s against a %o container matches: %s",
    (condition, size, matches) => {
      expect(containerQueryMatches(condition, size)).toBe(matches);
    },
  );
});

describe("interval (range pair) conditions", () => {
  /**
   * A 600x200 container, so both bounds of an interval on either axis can be
   * placed on either side of the measured value. Each bound is exercised open
   * and closed, because an interval is two comparisons and getting one of them
   * wrong still looks like an interval.
   *
   * As in the aspect-ratio table, the two verdicts observe opposite failures:
   * an interval arm that stops answering reddens only the `matches: true`
   * rows, and one that answers everything reddens only the `matches: false`
   * ones.
   */
  const cases: [condition: string, matches: boolean][] = [
    ["(400px < width < 800px)", true],
    ["(400px < width < 500px)", false],
    ["(700px < width < 800px)", false],
    // The measured width sits exactly on a bound: open excludes it, closed
    // includes it, at both ends.
    ["(600px < width < 800px)", false],
    ["(600px <= width < 800px)", true],
    ["(400px < width < 600px)", false],
    ["(400px < width <= 600px)", true],
    // The same interval written in the other direction.
    ["(800px > width > 400px)", true],
    ["(500px > width > 400px)", false],
    ["(100px < height < 300px)", true],
    ["(100px < height < 200px)", false],
  ];

  test.each(cases)(
    "@container %s against a 600x200 container matches: %s",
    (condition, matches) => {
      expect(
        containerQueryMatches(condition, { width: 600, height: 200 }),
      ).toBe(matches);
    },
  );
});

describe("a condition the compiler cannot evaluate", () => {
  /**
   * A `@container` block the compiler cannot compile a condition for must not
   * reach the runtime at all. The failure mode this pins is not a missed match
   * but the reverse: a block emitted with no condition applies to every child
   * that carries the class, at every container size.
   */
  const cases: [label: string, condition: string][] = [
    ["style()", "style(--foo: bar)"],
    ["an unresolvable feature value", "(width > env(safe-area-inset-top))"],
  ];

  test.each(cases)("@container %s never matches", (_label, condition) => {
    expect(containerQueryMatches(condition, { width: 400, height: 200 })).toBe(
      false,
    );
    expect(containerQueryMatches(condition, { width: 200, height: 400 })).toBe(
      false,
    );
  });
});

describe("orientation", () => {
  const cases: [
    condition: string,
    size: { width: number; height: number },
    matches: boolean,
  ][] = [
    ["(orientation: landscape)", { width: 400, height: 200 }, true],
    ["(orientation: portrait)", { width: 400, height: 200 }, false],
    ["(orientation: landscape)", { width: 200, height: 400 }, false],
    ["(orientation: portrait)", { width: 200, height: 400 }, true],
    // A square container is portrait: `landscape` requires width > height.
    ["(orientation: landscape)", { width: 300, height: 300 }, false],
    ["(orientation: portrait)", { width: 300, height: 300 }, true],
  ];

  test.each(cases)(
    "@container %s against a %o container matches: %s",
    (condition, size, matches) => {
      expect(containerQueryMatches(condition, size)).toBe(matches);
    },
  );
});
