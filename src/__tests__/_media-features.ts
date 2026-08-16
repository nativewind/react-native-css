import type { MediaFeatureComparison } from "react-native-css/compiler";

/**
 * The range vocabulary `@media` and `@container` share: the five comparison
 * operators, the two size features, and what each operator means.
 *
 * It is shared rather than restated per suite because one meaning has to hold
 * across the primitive, both evaluators and both at-rules. A second copy of a
 * five-armed operator table is the exact shape of the defect these tests
 * guard: two hand-written switches over the same five operators, differing by
 * one character, one of them wrong.
 *
 * This is not a test file — `testPathIgnorePatterns` skips a path segment
 * starting with an underscore.
 *
 * A note on how the tables built from this are read. A rendered case asserts a
 * verdict, and the two verdicts fail under opposite defects: a `matches: true`
 * row reddens when a condition stops being answered, because the block is then
 * dropped or refused; a `matches: false` row reddens when a condition stops
 * being asked, because the block is then emitted with nothing to check and
 * applies everywhere. Neither half observes the other's direction, so a table
 * of one verdict is half a table however many rows it has — which is why every
 * table here carries both, and why the counts of the two are worth keeping
 * near each other.
 *
 * A table's size is also not evidence that it covers anything. Every table is
 * generated from this census, so its length is the census's length by
 * construction and agrees with a census that lost an operator. Coverage is
 * asserted against {@link COMPARISON_MATCHES} instead, whose keys are the
 * `MediaFeatureComparison` union itself.
 */

/**
 * Where the measured value sits relative to the threshold the condition is
 * written against. Every range comparison is decided by this and nothing else,
 * so it is the dimension a table has to vary — and it is the dimension a
 * copy-pasted operator arm hides in, because any two operators agree on at
 * least one third of it.
 */
export type Ordering =
  | "measured < threshold"
  | "measured === threshold"
  | "measured > threshold";

export const ORDERINGS: Ordering[] = [
  "measured < threshold",
  "measured === threshold",
  "measured > threshold",
];

/**
 * What each comparison operator means, written out rather than computed.
 *
 * This is the specification every table is measured against. Deriving it from
 * the code under test would make each table agree with whatever that code
 * does, including a wrong operator — so it is literal, and it is the one place
 * the semantics are stated.
 *
 * Typed as a total `Record`, so an operator added to `MediaFeatureComparison`
 * is a compile error here rather than a silently uncovered arm.
 */
export const COMPARISON_MATCHES: Record<
  MediaFeatureComparison,
  Record<Ordering, boolean>
> = {
  "=": {
    "measured < threshold": false,
    "measured === threshold": true,
    "measured > threshold": false,
  },
  ">": {
    "measured < threshold": false,
    "measured === threshold": false,
    "measured > threshold": true,
  },
  ">=": {
    "measured < threshold": false,
    "measured === threshold": true,
    "measured > threshold": true,
  },
  "<": {
    "measured < threshold": true,
    "measured === threshold": false,
    "measured > threshold": false,
  },
  "<=": {
    "measured < threshold": true,
    "measured === threshold": true,
    "measured > threshold": false,
  },
};

export const COMPARISON_OPERATORS: MediaFeatureComparison[] = [
  "=",
  ">",
  ">=",
  "<",
  "<=",
];

/**
 * The `min-`/`max-` prefixed spelling of the two operators that have one.
 *
 * lightningcss normalises `(min-width: 400px)` into a `>=` range condition, so
 * the prefixed form is not a separate feature — it is the same condition
 * written a second way, and it has to compile to the same tuple and evaluate
 * to the same verdict. It is also the spelling almost every author writes, so
 * an operator defect reaches users through this row first.
 */
export const RANGE_PREFIX: Partial<
  Record<MediaFeatureComparison, "min" | "max">
> = {
  ">=": "min",
  "<=": "max",
};

/**
 * The two size features a range condition is written against. Both at-rules
 * accept both, and each has its own measurement — reading one axis off the
 * other is a defect no single-axis table can see.
 */
export const SIZE_FEATURES = ["width", "height"] as const;

export type SizeFeature = (typeof SIZE_FEATURES)[number];

export interface SizeComparison {
  /** The operator the runtime is handed, whatever spelling the CSS used. */
  operator: MediaFeatureComparison;
  feature: SizeFeature;
  /** `range` is `(width >= 400px)`; `prefixed` is `(min-width: 400px)`. */
  spelling: "range" | "prefixed";
  /** The condition as written inside the query's parentheses. */
  condition: (threshold: number) => string;
  /** Test-name fragment, e.g. `width >=` or `min-width:`. */
  label: string;
}

/**
 * Every way to write a size range condition: each operator on each axis, plus
 * the prefixed spelling of the two operators that have one.
 */
export function sizeComparisons(): SizeComparison[] {
  return SIZE_FEATURES.flatMap((feature) => {
    return COMPARISON_OPERATORS.flatMap((operator): SizeComparison[] => {
      const prefix = RANGE_PREFIX[operator];

      const range: SizeComparison = {
        operator,
        feature,
        spelling: "range",
        condition: (threshold) => `(${feature} ${operator} ${threshold}px)`,
        label: `${feature} ${operator}`,
      };

      if (!prefix) {
        return [range];
      }

      return [
        range,
        {
          operator,
          feature,
          spelling: "prefixed",
          condition: (threshold) => `(${prefix}-${feature}: ${threshold}px)`,
          label: `${prefix}-${feature}:`,
        },
      ];
    });
  });
}
