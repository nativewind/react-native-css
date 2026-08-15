import {
  conjoin,
  disjoin,
  matches,
  negate,
  UNKNOWN,
  type Truth,
} from "../../native/conditions/kleene";

/**
 * The whole truth table of CSS Media Queries 5 § 3.1, exhaustively. The union
 * is closed at three values, so "exhaustive" is a finite, checkable claim.
 */

const ALL: Truth[] = [true, false, UNKNOWN];

const identity = (value: Truth): Truth => value;

test("the union is exactly three values", () => {
  expect(ALL).toHaveLength(3);
  expect(new Set(ALL).size).toBe(3);
});

describe("negate", () => {
  const table: [Truth, Truth][] = [
    [true, false],
    [false, true],
    [UNKNOWN, UNKNOWN],
  ];

  test("covers every value", () => {
    expect(table.map(([input]) => input)).toStrictEqual(ALL);
  });

  test.each(table)("not %s is %s", (input, expected) => {
    expect(negate(input)).toStrictEqual(expected);
  });
});

describe("matches", () => {
  const table: [Truth, boolean][] = [
    [true, true],
    [false, false],
    // MQ5 § 3.1: unknown becomes false in a two-valued context.
    [UNKNOWN, false],
  ];

  test("covers every value", () => {
    expect(table.map(([input]) => input)).toStrictEqual(ALL);
  });

  test.each(table)("matches(%s) is %s", (input, expected) => {
    expect(matches(input)).toStrictEqual(expected);
  });
});

describe("conjoin", () => {
  // true if all are true, false if at least one is false, unknown otherwise.
  const table: [Truth, Truth, Truth][] = [
    [true, true, true],
    [true, false, false],
    [true, UNKNOWN, UNKNOWN],
    [false, true, false],
    [false, false, false],
    [false, UNKNOWN, false],
    [UNKNOWN, true, UNKNOWN],
    [UNKNOWN, false, false],
    [UNKNOWN, UNKNOWN, UNKNOWN],
  ];

  test("covers all nine pairs", () => {
    expect(table).toHaveLength(ALL.length * ALL.length);
    expect(new Set(table.map(([a, b]) => `${a}/${b}`)).size).toBe(9);
  });

  test.each(table)("%s and %s is %s", (left, right, expected) => {
    expect(conjoin([left, right], identity)).toStrictEqual(expected);
  });

  test("the empty conjunction is true", () => {
    expect(conjoin([], identity)).toBe(true);
  });

  test("stops at the first false", () => {
    const seen: Truth[] = [];

    const result = conjoin<Truth>([true, false, UNKNOWN], (term) => {
      seen.push(term);
      return term;
    });

    expect(result).toBe(false);
    expect(seen).toStrictEqual([true, false]);
  });

  test("an unknown does not stop the search for a false", () => {
    const seen: Truth[] = [];

    const result = conjoin<Truth>([UNKNOWN, false], (term) => {
      seen.push(term);
      return term;
    });

    expect(result).toBe(false);
    expect(seen).toStrictEqual([UNKNOWN, false]);
  });
});

describe("disjoin", () => {
  // false if all are false, true if at least one is true, unknown otherwise.
  const table: [Truth, Truth, Truth][] = [
    [true, true, true],
    [true, false, true],
    [true, UNKNOWN, true],
    [false, true, true],
    [false, false, false],
    [false, UNKNOWN, UNKNOWN],
    [UNKNOWN, true, true],
    [UNKNOWN, false, UNKNOWN],
    [UNKNOWN, UNKNOWN, UNKNOWN],
  ];

  test("covers all nine pairs", () => {
    expect(table).toHaveLength(ALL.length * ALL.length);
    expect(new Set(table.map(([a, b]) => `${a}/${b}`)).size).toBe(9);
  });

  test.each(table)("%s or %s is %s", (left, right, expected) => {
    expect(disjoin([left, right], identity)).toStrictEqual(expected);
  });

  test("the empty disjunction is false", () => {
    expect(disjoin([], identity)).toBe(false);
  });

  test("stops at the first true", () => {
    const seen: Truth[] = [];

    const result = disjoin<Truth>([false, true, UNKNOWN], (term) => {
      seen.push(term);
      return term;
    });

    expect(result).toBe(true);
    expect(seen).toStrictEqual([false, true]);
  });

  test("an unknown does not stop the search for a true", () => {
    const seen: Truth[] = [];

    const result = disjoin<Truth>([UNKNOWN, true], (term) => {
      seen.push(term);
      return term;
    });

    expect(result).toBe(true);
    expect(seen).toStrictEqual([UNKNOWN, true]);
  });
});

describe("De Morgan holds across all nine pairs", () => {
  const pairs = ALL.flatMap((left) =>
    ALL.map((right): [Truth, Truth] => [left, right]),
  );

  test.each(pairs)("not(%s and %s) === (not %s) or (not %s)", (left, right) => {
    expect(negate(conjoin([left, right], identity))).toStrictEqual(
      disjoin([negate(left), negate(right)], identity),
    );
  });
});
