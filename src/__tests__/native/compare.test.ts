import type { MediaFeatureComparison } from "react-native-css/compiler";

import { compareMediaFeature } from "../../native/conditions/compare";

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
