import type {
  MediaCondition,
  MediaFeatureComparison,
  StyleDescriptor,
} from "react-native-css/compiler";

export type MediaInterval = Extract<MediaCondition, ["[]", ...unknown[]]>;

// Media and container queries share this, so each operator has one meaning
export function compareMediaFeature(
  operator: MediaFeatureComparison,
  left: StyleDescriptor,
  right: StyleDescriptor,
): boolean {
  // = also compares keywords such as landscape
  if (operator === "=") {
    return left === right;
  }

  // The rest are arithmetic, where a string would coerce
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

// The compiler emits a range pair in source order: start, operator, value, operator, end
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
