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
 * Evaluates a single CSS range comparison.
 *
 * Media queries and container queries share the `MediaFeatureComparison`
 * vocabulary, so they share this one implementation of it: an operator has
 * exactly one meaning at runtime, and the two evaluators cannot drift apart.
 * A second hand-written copy of the switch is the defect this prevents — the
 * arms differ by a single character, so a wrong one reads as correct.
 */
export function compareMediaFeature(
  operator: MediaFeatureComparison,
  left: number,
  right: number,
): boolean {
  switch (operator) {
    case "=":
      return left === right;
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
 */
export function testMediaFeatureInterval(
  condition: MediaInterval,
  value: StyleDescriptor,
): boolean {
  const [, , start, startOperator, end, endOperator] = condition;

  if (
    typeof value !== "number" ||
    typeof start !== "number" ||
    typeof end !== "number"
  ) {
    return false;
  }

  return (
    compareMediaFeature(startOperator, start, value) &&
    compareMediaFeature(endOperator, value, end)
  );
}
