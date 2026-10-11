import {
  conjoin,
  disjoin,
  matches,
  negate,
  UNKNOWN,
  type Truth,
} from "../../native/conditions/kleene";

const identity = (value: Truth): Truth => value;

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
    expect(conjoin([left, right], identity)).toBe(conjunction);
    expect(conjoin([right, left], identity)).toBe(conjunction);
    expect(disjoin([left, right], identity)).toBe(disjunction);
    expect(disjoin([right, left], identity)).toBe(disjunction);
  },
);

test("an empty conjunction is true and an empty disjunction false", () => {
  expect(conjoin([], identity)).toBe(true);
  expect(disjoin([], identity)).toBe(false);
});

test("a decided term stops the evaluation, and an unknown one does not", () => {
  const evaluated: Truth[] = [];
  const record = (value: Truth): Truth => {
    evaluated.push(value);
    return value;
  };

  expect(conjoin([UNKNOWN, false, true], record)).toBe(false);
  expect(disjoin([UNKNOWN, true, false], record)).toBe(true);
  expect(evaluated).toStrictEqual([UNKNOWN, false, UNKNOWN, true]);
});
