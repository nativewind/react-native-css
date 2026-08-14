import type { MediaFeatureComparison } from "react-native-css/compiler";

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
