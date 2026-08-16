import type {
  MediaCondition,
  MediaFeatureComparison,
  StyleDescriptor,
} from "react-native-css/compiler";

/**
 * The interval arm of {@link MediaCondition}, derived from the union rather
 * than restated so it cannot drift from the compiler's output.
 */
export type MediaInterval = Extract<MediaCondition, ["[]", ...unknown[]]>;

/**
 * Evaluates a single CSS comparison against whatever the feature answered.
 *
 * Media queries and container queries share the `MediaFeatureComparison`
 * vocabulary, so they share this one implementation of it: an operator has
 * exactly one meaning at runtime, and the two evaluators cannot drift apart.
 * A second hand-written copy of an arm is the defect this prevents — the arms
 * differ by a single character, so a wrong one reads as correct.
 *
 * Both operands are `StyleDescriptor` rather than `number`, because that is
 * what a feature answers and because narrowing at the call site is how the
 * second copy gets written: an evaluator that has to reject a keyword before
 * it can call this ends up deciding `=` itself.
 */
export function compareMediaFeature(
  operator: MediaFeatureComparison,
  left: StyleDescriptor,
  right: StyleDescriptor,
): boolean {
  // `=` is the one operator with a meaning off the number line — `orientation`
  // answers `"landscape"`, and equality is the only comparison that says
  // anything about a keyword. A feature the evaluator could not measure
  // answers `undefined`, which equals nothing, not even another unmeasured
  // feature.
  if (operator === "=") {
    return left !== undefined && left === right;
  }

  // The remaining four are arithmetic, so a value that is not a number has
  // nothing to compare. Coercion is the trap: `400 < "500"` is `400 < 500`,
  // which answers a query about a feature that was never measured.
  if (typeof left !== "number" || typeof right !== "number") {
    return false;
  }

  switch (operator) {
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    default:
      operator satisfies never;
      return false;
  }
}

/**
 * Evaluates a CSS range pair — `(400px < width < 800px)` and the three other
 * ways to write two bounds around one feature.
 *
 * The compiler emits the pair in source order, so the two comparisons read the
 * way they were written: the start bound is on the left of its operator and
 * the measured value on the right, and the end bound the other way round.
 * Both call sites share this one destructuring, because an interval whose
 * halves are assembled in the wrong order is still a well-formed interval and
 * says something else.
 *
 * An interval is two comparisons and nothing more, so it holds no numeric
 * guard of its own: an unmeasured value or an unresolved bound fails whichever
 * comparison it is an operand of.
 */
export function testMediaFeatureInterval(
  condition: MediaInterval,
  value: StyleDescriptor,
): boolean {
  const [, , start, startOperator, end, endOperator] = condition;

  return (
    compareMediaFeature(startOperator, start, value) &&
    compareMediaFeature(endOperator, value, end)
  );
}
