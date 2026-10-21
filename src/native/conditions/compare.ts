import type {
  MediaCondition,
  MediaFeatureComparison,
  MediaFeatureOperand,
} from "react-native-css/compiler";

import { conjoin, disjoin, negate, UNKNOWN, type Truth } from "./kleene";

export type MediaInterval = Extract<MediaCondition, ["[]", ...unknown[]]>;

export type MediaComparison = Extract<
  MediaCondition,
  [MediaFeatureComparison, ...unknown[]]
>;

export type MediaFeatureName = MediaComparison[1];

// undefined for a feature the runtime does not measure
export type MeasuredFeatureValue = number | string | undefined;

// A media query and a container query differ only in how a feature is read and compared
export interface FeatureReader {
  readonly read: (name: MediaFeatureName) => MeasuredFeatureValue;
  readonly compare: (comparison: Readonly<MediaComparison>) => Truth;
}

export function evaluateCondition(
  condition: MediaCondition,
  reader: FeatureReader,
): Truth {
  switch (condition[0]) {
    case "?":
      return UNKNOWN;
    case "!!":
      return isTruthyFeatureValue(reader.read(condition[1]));
    case "[]":
      return testMediaFeatureInterval(condition, reader.read(condition[1]));
    case "!":
      return negate(evaluateCondition(condition[1], reader));
    case "&":
      return conjoin(condition[1], (term) => evaluateCondition(term, reader));
    case "|":
      return disjoin(condition[1], (term) => evaluateCondition(term, reader));
    case ">":
    case ">=":
    case "<":
    case "<=":
    case "=":
      return reader.compare(condition);
    default:
      condition satisfies never;
      return UNKNOWN;
  }
}

// Media and container queries share this, so each operator has one meaning; an unmeasured feature or an unresolved operand is unknown (MQ5 §3.1)
export function compareMediaFeature(
  operator: MediaFeatureComparison,
  left: Readonly<MediaFeatureOperand> | undefined,
  right: Readonly<MediaFeatureOperand> | undefined,
): Truth {
  if (
    left === undefined ||
    left === null ||
    right === undefined ||
    right === null
  ) {
    return UNKNOWN;
  }

  // A descriptor the runtime does not resolve, such as an em or a calc(), has no value to compare with
  if (typeof left === "object" || typeof right === "object") {
    return UNKNOWN;
  }

  // = also compares keywords such as landscape
  if (operator === "=") {
    return left === right;
  }

  if (typeof left !== "number" || typeof right !== "number") {
    return UNKNOWN;
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
      return UNKNOWN;
  }
}

// The compiler emits a range pair in source order: start, operator, value, operator, end
export function testMediaFeatureInterval(
  condition: Readonly<MediaInterval>,
  value: MeasuredFeatureValue,
): Truth {
  const [, , start, startOperator, end, endOperator] = condition;

  return conjoin(
    [
      compareMediaFeature(startOperator, start, value),
      compareMediaFeature(endOperator, value, end),
    ],
    (truth) => truth,
  );
}

// A feature in a boolean context is false for zero, none and the no-preference of a user preference, and true for every other value (MQ5 §2.4.2, §12)
export function isTruthyFeatureValue(value: MeasuredFeatureValue): Truth {
  switch (typeof value) {
    case "undefined":
      return UNKNOWN;
    case "number":
      return value !== 0 && !Number.isNaN(value);
    case "string":
      return value !== "none" && value !== "no-preference";
    default:
      value satisfies never;
      return UNKNOWN;
  }
}
