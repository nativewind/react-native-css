import type { StyleDescriptor } from "react-native-css/compiler";

import {
  COMPARISON_MATCHES,
  COMPARISON_OPERATORS,
  ORDERINGS,
  RANGE_PREFIX,
  SIZE_FEATURES,
  sizeComparisons,
  type Ordering,
} from "../_media-features";
import {
  compareMediaFeature,
  testMediaFeatureInterval,
  type MediaInterval,
} from "../../native/conditions/compare";

/**
 * The full cross product of every comparison operator against every ordering
 * of its two operands. A copy-pasted switch arm is only visible when both are
 * varied: `>=` and `>` agree on two thirds of this table, and the third they
 * disagree on is the one CSS authors write `min-width` for.
 *
 * The verdicts come from the shared census, which is also what the rendered
 * `@media` and `@container` tables are measured against — so the primitive and
 * the two at-rules cannot disagree about what an operator means.
 */
const operands: Record<Ordering, [measured: number, threshold: number]> = {
  "measured < threshold": [100, 200],
  "measured === threshold": [200, 200],
  "measured > threshold": [300, 200],
};

const cases = COMPARISON_OPERATORS.flatMap((operator) => {
  return ORDERINGS.map((ordering) => {
    const [measured, threshold] = operands[ordering];
    return [
      operator,
      ordering,
      measured,
      threshold,
      COMPARISON_MATCHES[operator][ordering],
    ] as const;
  });
});

test("the table covers every operator against every ordering", () => {
  expect([...COMPARISON_OPERATORS].sort()).toStrictEqual(
    Object.keys(COMPARISON_MATCHES).sort(),
  );
  expect([...ORDERINGS].sort()).toStrictEqual(Object.keys(operands).sort());
  expect(cases).toHaveLength(COMPARISON_OPERATORS.length * ORDERINGS.length);
  expect(cases.length).toBeGreaterThan(0);
});

describe("the shared range-condition census", () => {
  /**
   * `sizeComparisons()` generates the tables in every suite that renders a
   * range condition. An empty or partial census is a silent no-op there — the
   * `test.each` produces fewer cases and every suite stays green — so its
   * completeness is asserted once, here, where the operator census lives.
   */
  const rows = sizeComparisons();

  test("every operator appears on every size feature", () => {
    expect(rows.length).toBeGreaterThan(0);

    expect(
      rows
        .filter((row) => row.spelling === "range")
        .map((row) => `${row.feature} ${row.operator}`)
        .sort(),
    ).toStrictEqual(
      SIZE_FEATURES.flatMap((feature) => {
        return COMPARISON_OPERATORS.map((operator) => `${feature} ${operator}`);
      }).sort(),
    );
  });

  test("every prefixed spelling appears on every size feature", () => {
    expect(
      rows
        .filter((row) => row.spelling === "prefixed")
        .map((row) => `${row.feature} ${row.operator}`)
        .sort(),
    ).toStrictEqual(
      SIZE_FEATURES.flatMap((feature) => {
        return Object.keys(RANGE_PREFIX).map((operator) => {
          return `${feature} ${operator}`;
        });
      }).sort(),
    );
  });

  test("a condition is written the way CSS spells it", () => {
    const conditions = rows.map((row) => row.condition(400));

    expect(conditions).toContain("(width >= 400px)");
    expect(conditions).toContain("(min-width: 400px)");
    expect(conditions).toContain("(height <= 400px)");
    expect(conditions).toContain("(max-height: 400px)");
  });
});

test.each(cases)(
  "%s with %s: compareMediaFeature(_, %d, %d) === %s",
  (operator, _ordering, measured, threshold, result) => {
    expect(compareMediaFeature(operator, measured, threshold)).toBe(result);
  },
);

describe("testMediaFeatureInterval", () => {
  /**
   * The two halves of an interval are asymmetric — the start bound is compared
   * against the measured value and the value against the end bound — so a
   * table that only varies the value cannot tell a correct implementation from
   * one that assembled the halves the other way round. These cases vary which
   * side of each bound the value falls on, and pair a strict operator with a
   * non-strict one so the two are never interchangeable.
   */
  const cases: [
    label: string,
    condition: MediaInterval,
    value: number,
    matches: boolean,
  ][] = [
    ["inside", ["[]", "width", 400, "<", 800, "<"], 600, true],
    ["below the start bound", ["[]", "width", 400, "<", 800, "<"], 300, false],
    ["above the end bound", ["[]", "width", 400, "<", 800, "<"], 900, false],
    ["on an open start bound", ["[]", "width", 400, "<", 800, "<"], 400, false],
    [
      "on a closed start bound",
      ["[]", "width", 400, "<=", 800, "<"],
      400,
      true,
    ],
    ["on an open end bound", ["[]", "width", 400, "<", 800, "<"], 800, false],
    ["on a closed end bound", ["[]", "width", 400, "<", 800, "<="], 800, true],
    // Written in the other direction: `800px > width > 400px`.
    ["descending, inside", ["[]", "width", 800, ">", 400, ">"], 600, true],
    ["descending, outside", ["[]", "width", 800, ">", 400, ">"], 300, false],
  ];

  test.each(cases)("%s", (_label, condition, value, matches) => {
    expect(testMediaFeatureInterval(condition, value)).toBe(matches);
  });

  /**
   * A feature the evaluator could not measure, and a bound the compiler could
   * not resolve, are both "no answer" rather than "no bound".
   */
  const unanswerable: [
    label: string,
    condition: MediaInterval,
    value: unknown,
  ][] = [
    ["an unmeasurable feature", ["[]", "width", 400, "<", 800, "<"], undefined],
    [
      "a non-numeric feature value",
      ["[]", "orientation", 400, "<", 800, "<"],
      "landscape",
    ],
    [
      "an unresolved start bound",
      ["[]", "width", undefined, "<", 800, "<"],
      600,
    ],
    ["an unresolved end bound", ["[]", "width", 400, "<", undefined, "<"], 600],
  ];

  test.each(unanswerable)("%s never matches", (_label, condition, value) => {
    expect(testMediaFeatureInterval(condition, value as StyleDescriptor)).toBe(
      false,
    );
  });
});
