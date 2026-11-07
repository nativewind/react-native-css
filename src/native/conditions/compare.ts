import type {
  MediaCondition,
  MediaFeatureComparison,
  MediaFeatureOperand,
} from "react-native-css/compiler";

import type { Getter } from "../reactivity";
import { viewportLength } from "../styles/units";
import { and, negate, or, UNKNOWN, type Truth } from "./kleene";

export type MediaInterval = Extract<
  MediaCondition,
  readonly ["[]", ...unknown[]]
>;

export type MediaComparison = Extract<
  MediaCondition,
  readonly [MediaFeatureComparison, ...unknown[]]
>;

export type MediaFeatureName = MediaComparison[1];

// undefined for a feature the runtime does not measure
export type MeasuredFeatureValue = number | string | undefined;

// A media query and a container query differ only in how a feature is read and compared; the context is what a reading needs, passed along so the walk over a condition's terms allocates nothing
export interface FeatureReader<Context> {
  readonly read: (
    name: MediaFeatureName,
    context: Context,
  ) => MeasuredFeatureValue;
  readonly compare: (
    condition: MediaComparison | MediaInterval,
    context: Context,
  ) => Truth;
}

export function evaluateCondition<Context>(
  condition: MediaCondition,
  reader: FeatureReader<Context>,
  context: Context,
): Truth {
  switch (condition[0]) {
    case "?":
      return UNKNOWN;
    case "!!":
      return isTruthyFeatureValue(reader.read(condition[1], context));
    case "!":
      return negate(evaluateCondition(condition[1], reader, context));
    // Evaluating a term subscribes to what it reads, so a decided conjunction or disjunction evaluates no further terms
    case "&": {
      let truth: Truth = true;
      for (const term of condition[1]) {
        truth = and(truth, evaluateCondition(term, reader, context));
        if (truth === false) {
          return false;
        }
      }
      return truth;
    }
    case "|": {
      let truth: Truth = false;
      for (const term of condition[1]) {
        truth = or(truth, evaluateCondition(term, reader, context));
        if (truth === true) {
          return true;
        }
      }
      return truth;
    }
    case "[]":
    case ">":
    case ">=":
    case "<":
    case "<=":
    case "=":
      return reader.compare(condition, context);
    default:
      condition satisfies never;
      return UNKNOWN;
  }
}

// Media and container queries share this, so each operator has one meaning; an unmeasured feature or an unresolved operand is unknown (MQ5 §3.1)
export function compareMediaFeature(
  operator: MediaFeatureComparison,
  left: MediaFeatureOperand | undefined,
  right: MediaFeatureOperand | undefined,
  get: Getter,
): Truth {
  if (
    left === undefined ||
    left === null ||
    right === undefined ||
    right === null
  ) {
    return UNKNOWN;
  }

  const leftValue =
    typeof left === "object" ? resolveViewportLength(left, get) : left;
  const rightValue =
    typeof right === "object" ? resolveViewportLength(right, get) : right;

  if (leftValue === undefined || rightValue === undefined) {
    return UNKNOWN;
  }

  // = also compares keywords such as landscape
  if (operator === "=") {
    return leftValue === rightValue;
  }

  if (typeof leftValue !== "number" || typeof rightValue !== "number") {
    return UNKNOWN;
  }

  switch (operator) {
    case ">":
      return leftValue > rightValue;
    case ">=":
      return leftValue >= rightValue;
    case "<":
      return leftValue < rightValue;
    case "<=":
      return leftValue <= rightValue;
    default:
      operator satisfies never;
      return UNKNOWN;
  }
}

// A viewport length is relative to the window in a media query and a container query alike (css-values-4 §6.1.2); any other descriptor, such as an em or a calc(), has no value the runtime compares
function resolveViewportLength(
  descriptor: Extract<MediaFeatureOperand, object>,
  get: Getter,
): number | undefined {
  const unit = descriptor[1];
  const percentage = descriptor[2];

  return (unit === "vw" || unit === "vh") && typeof percentage === "number"
    ? viewportLength(unit, percentage, get)
    : undefined;
}

// The compiler emits a range pair in source order: start, operator, value, operator, end; it is read by index, since Babel compiles a destructured tuple to a helper call that costs more than the comparisons
export function testMediaFeatureInterval(
  condition: MediaInterval,
  value: MeasuredFeatureValue,
  get: Getter,
): Truth {
  return and(
    compareMediaFeature(condition[3], condition[2], value, get),
    compareMediaFeature(condition[5], value, condition[4], get),
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
