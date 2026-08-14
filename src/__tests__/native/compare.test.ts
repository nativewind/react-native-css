import type {
  MediaFeatureComparison,
  StyleDescriptor,
} from "react-native-css/compiler";

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
 */
type Ordering = "left < right" | "left === right" | "left > right";

const operands: Record<Ordering, [left: number, right: number]> = {
  "left < right": [100, 200],
  "left === right": [200, 200],
  "left > right": [300, 200],
};

/**
 * Typed as a total `Record`, so an operator added to `MediaFeatureComparison`
 * is a compile error here rather than a silently uncovered arm.
 */
const expected: Record<MediaFeatureComparison, Record<Ordering, boolean>> = {
  "=": {
    "left < right": false,
    "left === right": true,
    "left > right": false,
  },
  ">": {
    "left < right": false,
    "left === right": false,
    "left > right": true,
  },
  ">=": {
    "left < right": false,
    "left === right": true,
    "left > right": true,
  },
  "<": {
    "left < right": true,
    "left === right": false,
    "left > right": false,
  },
  "<=": {
    "left < right": true,
    "left === right": true,
    "left > right": false,
  },
};

const operators: MediaFeatureComparison[] = ["=", ">", ">=", "<", "<="];
const orderings: Ordering[] = [
  "left < right",
  "left === right",
  "left > right",
];

const cases = operators.flatMap((operator) => {
  return orderings.map((ordering) => {
    const [left, right] = operands[ordering];
    return [
      operator,
      ordering,
      left,
      right,
      expected[operator][ordering],
    ] as const;
  });
});

test("the table covers every operator against every ordering", () => {
  expect([...operators].sort()).toStrictEqual(Object.keys(expected).sort());
  expect([...orderings].sort()).toStrictEqual(Object.keys(operands).sort());
  expect(cases).toHaveLength(operators.length * orderings.length);
  expect(cases.length).toBeGreaterThan(0);
});

test.each(cases)(
  "%s with %s: compareMediaFeature(_, %d, %d) === %s",
  (operator, _ordering, left, right, result) => {
    expect(compareMediaFeature(operator, left, right)).toBe(result);
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
