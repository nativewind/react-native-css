import type {
  CalcFor_Length,
  MediaCondition as CSSMediaCondition,
  MediaFeatureComparison as CSSMediaFeatureComparison,
  MediaFeatureValue as CSSMediaFeatureValue,
  MediaQuery as CSSMediaQuery,
  QueryFeatureFor_MediaFeatureId,
} from "lightningcss";

import { asciiLowerCase } from "../utilities/ascii-case";
import type {
  MediaCondition,
  MediaFeatureComparison,
  MediaFeatureOperand,
  StyleDescriptor,
} from "./compiler.types";
import { parseLength } from "./declarations";
import type { StylesheetBuilder } from "./stylesheet";

export function parseMediaQuery(
  query: CSSMediaQuery,
  builder: StylesheetBuilder,
) {
  let platformCondition: MediaCondition | undefined;
  let condition: MediaCondition | undefined;

  if (query.mediaType) {
    // Native screens never match print. Negating that media type matches
    // regardless of the remaining feature tests in the same conjunction.
    if (query.mediaType === "print") {
      return query.qualifier === "not";
    }

    // These all/screen are not conditions, they always apply
    if (query.mediaType !== "all" && query.mediaType !== "screen") {
      platformCondition = ["=", "platform", query.mediaType];
    }
  }

  if (query.condition) {
    condition = parseMediaQueryCondition(query.condition, builder);
  }

  let mediaQuery: MediaCondition | undefined =
    platformCondition && condition
      ? ["&", [platformCondition, condition]]
      : (platformCondition ?? condition);

  if (!mediaQuery) {
    // Unqualified all/screen apply; not all and not screen do not.
    return query.qualifier !== "not";
  }

  if (query.qualifier === "not") {
    mediaQuery = ["!", mediaQuery];
  }

  if (!canMatch(mediaQuery)) {
    return false;
  }

  builder.addMediaQuery(mediaQuery);
  return true;
}

// A condition that no device can make true, as an unknown keeps an `and` or a `not` unknown (MQ5 §3.1), compiles to no rule
export function canMatch(condition: MediaCondition): boolean {
  return canEvaluateTo(condition, true);
}

function canEvaluateTo(condition: MediaCondition, truth: boolean): boolean {
  switch (condition[0]) {
    case "?":
      return false;
    case "!":
      return canEvaluateTo(condition[1], !truth);
    case "&":
      return truth
        ? condition[1].every((child) => canEvaluateTo(child, true))
        : condition[1].some((child) => canEvaluateTo(child, false));
    case "|":
      return truth
        ? condition[1].some((child) => canEvaluateTo(child, true))
        : condition[1].every((child) => canEvaluateTo(child, false));
    case "!!":
      return true;
    case "[]": {
      const [, , start, , end] = condition;
      return truth
        ? start !== null && end !== null
        : start !== null || end !== null;
    }
    case "=":
    case ">":
    case ">=":
    case "<":
    case "<=":
      return condition[2] !== null;
    default:
      condition satisfies never;
      return true;
  }
}

function parseMediaQueryCondition(
  query: CSSMediaCondition,
  builder: StylesheetBuilder,
): MediaCondition {
  switch (query.type) {
    case "feature":
      return parseFeature(query.value, builder);
    case "not":
      return ["!", parseMediaQueryCondition(query.value, builder)];
    case "operation": {
      const mediaQueries = query.conditions.map((condition) =>
        parseMediaQueryCondition(condition, builder),
      );

      switch (query.operator) {
        case "and":
          return ["&", mediaQueries];
        case "or":
          return ["|", mediaQueries];
        default:
          query.operator satisfies never;
          throw new Error(
            `Unknown media condition operator ${JSON.stringify(query)}`,
          );
      }
    }
    default:
      query satisfies never;
      throw new Error(`Unknown media condition ${JSON.stringify(query)}`);
  }
}

// The keywords Media Queries 4 and 5 give each discrete feature the runtime answers; any other keyword leaves the feature unknown (MQ5 §3.1)
const FEATURE_KEYWORDS: ReadonlyMap<string, readonly string[]> = new Map([
  ["hover", ["none", "hover"]],
  ["any-hover", ["none", "hover"]],
  ["orientation", ["portrait", "landscape"]],
  ["prefers-color-scheme", ["light", "dark"]],
  ["prefers-reduced-motion", ["no-preference", "reduce"]],
  ["scripting", ["none", "initial-only", "enabled"]],
  ["update", ["none", "slow", "fast"]],
]);

export function isUnknownKeyword(name: string, operand: MediaFeatureOperand) {
  const keywords = FEATURE_KEYWORDS.get(name);
  return (
    keywords !== undefined &&
    typeof operand === "string" &&
    !keywords.includes(operand)
  );
}

function parseFeature(
  feature: QueryFeatureFor_MediaFeatureId,
  builder: StylesheetBuilder,
): MediaCondition {
  switch (feature.type) {
    case "boolean":
      return ["!!", feature.name];
    case "plain": {
      const operand = parseMediaFeatureOperand(feature.value, builder);
      return isUnknownKeyword(feature.name, operand)
        ? ["?"]
        : ["=", feature.name, operand];
    }
    case "range":
      return [
        parseMediaFeatureOperator(feature.operator),
        feature.name,
        parseMediaFeatureOperand(feature.value, builder),
      ];
    case "interval":
      return [
        "[]",
        feature.name,
        parseMediaFeatureOperand(feature.start, builder),
        parseMediaFeatureOperator(feature.startOperator),
        parseMediaFeatureOperand(feature.end, builder),
        parseMediaFeatureOperator(feature.endOperator),
      ];
    default:
      feature satisfies never;
      throw new Error(`Unknown media feature ${JSON.stringify(feature)}`);
  }
}

function parseMediaFeatureOperand(
  value: CSSMediaFeatureValue,
  builder: StylesheetBuilder,
): MediaFeatureOperand {
  return parseMediaFeatureValue(value, builder) ?? null;
}

export function parseMediaFeatureValue(
  value: CSSMediaFeatureValue,
  builder: StylesheetBuilder,
): StyleDescriptor {
  switch (value.type) {
    // <mq-boolean> is the integer 0 or 1 (MQ4 §5.3)
    case "boolean":
      return value.value ? 1 : 0;
    case "ident":
      // Keywords are ASCII case-insensitive (css-values-4 §4.1)
      return asciiLowerCase(value.value);
    case "integer":
    case "number":
      return value.value;
    case "length":
      switch (value.value.type) {
        case "value":
          return parseLength(value.value.value, builder);
        case "calc":
          return parseCalcFn(value.value.value, builder);
        default:
          value.value satisfies never;
          return;
      }
    case "resolution":
      switch (value.value.type) {
        case "dpi":
          // Mobile devices use 160 as a standard
          return value.value.value / 160;
        case "dpcm":
          // There are 1in = ~2.54cm
          return value.value.value / (160 * 2.54);
        case "dppx":
          return value.value.value;
        default:
          value.value satisfies never;
          return undefined;
      }
    case "ratio":
    case "env":
      return undefined;
    default:
      value satisfies never;
      return undefined;
  }
}

export function parseMediaFeatureOperator(
  operator: CSSMediaFeatureComparison,
): MediaFeatureComparison {
  switch (operator) {
    case "equal":
      return "=";
    case "greater-than":
      return ">";
    case "greater-than-equal":
      return ">=";
    case "less-than":
      return "<";
    case "less-than-equal":
      return "<=";
    default:
      operator satisfies never;
      throw new Error(
        `Unknown MediaFeatureComparison operator ${JSON.stringify(operator)}`,
      );
  }
}

function parseCalcFn(
  calc: CalcFor_Length,
  builder: StylesheetBuilder,
): StyleDescriptor {
  switch (calc.type) {
    case "number":
      return calc.value;
    case "value":
      return parseLength(calc.value, builder);
    case "sum":
      return [{}, "sum", calc.value.map((c) => parseCalcFn(c, builder))];
    case "product":
      return [
        {},
        "product",
        [calc.value[0], parseCalcFn(calc.value[1], builder)],
      ];
    case "function":
      switch (calc.value.type) {
        case "calc":
          return parseCalcFn(calc.value.value, builder);
        case "min":
        case "max":
        case "clamp":
        case "rem":
        case "mod":
        case "hypot":
          return [
            {},
            calc.value.type,
            calc.value.value.map((c) => parseCalcFn(c, builder)),
          ];
        case "abs":
        case "sign":
          return [
            {},
            calc.value.type,
            [parseCalcFn(calc.value.value, builder)],
          ];
        case "round":
          return [
            {},
            calc.value.type,
            [
              calc.value.value[0],
              parseCalcFn(calc.value.value[1], builder),
              parseCalcFn(calc.value.value[2], builder),
            ],
          ];
        default:
          calc.value satisfies never;
          return;
      }
    default:
      calc satisfies never;
  }

  return;
}
