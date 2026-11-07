import {
  and,
  matches,
  negate,
  or,
  UNKNOWN,
} from "../../native/conditions/kleene";

test.each([
  [true, false],
  [false, true],
  [UNKNOWN, UNKNOWN],
] as const)("not %s is %s", (value, expected) => {
  expect(negate(value)).toBe(expected);
});

test.each([
  [true, true],
  [false, false],
  [UNKNOWN, false],
] as const)("a rule applies on %s: %s", (value, expected) => {
  expect(matches(value)).toBe(expected);
});

test.each([
  [true, true, true, true],
  [true, false, false, true],
  [true, UNKNOWN, UNKNOWN, true],
  [false, false, false, false],
  [false, UNKNOWN, false, UNKNOWN],
  [UNKNOWN, UNKNOWN, UNKNOWN, UNKNOWN],
] as const)(
  "%s with %s: and is %s, or is %s",
  (left, right, conjunction, disjunction) => {
    expect(and(left, right)).toBe(conjunction);
    expect(and(right, left)).toBe(conjunction);
    expect(or(left, right)).toBe(disjunction);
    expect(or(right, left)).toBe(disjunction);
  },
);
