import type {
  CalcFor_Length,
  MediaCondition as CSSMediaCondition,
  MediaFeatureComparison as CSSMediaFeatureComparison,
  MediaFeatureValue as CSSMediaFeatureValue,
  MediaQuery as CSSMediaQuery,
  QueryFeatureFor_ContainerSizeFeatureId,
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
      // Media types are ASCII case-insensitive (MQ4 §3), and lightningcss lowercases only all, print and screen
      platformCondition = ["=", "platform", asciiLowerCase(query.mediaType)];
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

// A condition its unknown terms and unresolved operands leave no way to be true compiles to no rule, as an unknown keeps an `and` or a `not` unknown (MQ5 §3.1)
export function canMatch(condition: Readonly<MediaCondition>): boolean {
  return canEvaluateTo(condition, true);
}

function canEvaluateTo(
  condition: Readonly<MediaCondition>,
  truth: boolean,
): boolean {
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

export function parseMediaQueryCondition(
  query: CSSMediaCondition,
  builder: StylesheetBuilder,
): MediaCondition {
  switch (query.type) {
    case "feature":
      return parseQueryFeature(query.value, builder) ?? ["?"];
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
          return ["?"];
      }
    }
    default:
      query satisfies never;
      // A lightningcss newer than its types emits conditions they do not list, such as error recovery's <general-enclosed>, which MQ5 §3.1 leaves unknown
      return ["?"];
  }
}

// The keywords Media Queries 4 and 5 give these discrete features, and any other keyword leaves the feature unknown (MQ5 §3.1); display-mode is left out, since the library answers it with platform names
const FEATURE_KEYWORDS: ReadonlyMap<string, readonly string[]> = new Map([
  ["hover", ["none", "hover"]],
  ["any-hover", ["none", "hover"]],
  ["pointer", ["none", "coarse", "fine"]],
  ["any-pointer", ["none", "coarse", "fine"]],
  ["orientation", ["portrait", "landscape"]],
  ["prefers-color-scheme", ["light", "dark"]],
  ["prefers-reduced-motion", ["no-preference", "reduce"]],
  ["scripting", ["none", "initial-only", "enabled"]],
  ["update", ["none", "slow", "fast"]],
]);

function isUnknownKeyword(
  name: string,
  operand: Readonly<MediaFeatureOperand>,
) {
  const keywords = FEATURE_KEYWORDS.get(name);
  return (
    keywords !== undefined &&
    typeof operand === "string" &&
    !keywords.includes(operand)
  );
}

// A feature holding env() or a keyword it does not take compiles to undefined, which a media query reads as unknown and a container query as no query
export function parseQueryFeature(
  feature:
    | QueryFeatureFor_MediaFeatureId
    | QueryFeatureFor_ContainerSizeFeatureId,
  builder: StylesheetBuilder,
): MediaCondition | undefined {
  switch (feature.type) {
    case "boolean":
      return ["!!", feature.name];
    case "plain": {
      const operand = parseFeatureOperand(feature.value, builder);
      return operand === undefined || isUnknownKeyword(feature.name, operand)
        ? undefined
        : ["=", feature.name, operand];
    }
    case "range": {
      const operand = parseFeatureOperand(feature.value, builder);
      return operand === undefined
        ? undefined
        : [parseMediaFeatureOperator(feature.operator), feature.name, operand];
    }
    case "interval": {
      const start = parseFeatureOperand(feature.start, builder);
      const end = parseFeatureOperand(feature.end, builder);
      return start === undefined || end === undefined
        ? undefined
        : [
            "[]",
            feature.name,
            start,
            parseMediaFeatureOperator(feature.startOperator),
            end,
            parseMediaFeatureOperator(feature.endOperator),
          ];
    }
    default:
      feature satisfies never;
      return undefined;
  }
}

// No browser takes env() as a media feature's value, and Chromium and WebKit drop a container query holding one, so a feature holding it compiles to undefined; any other value the compiler cannot resolve compiles to null, which leaves its term unknown
function parseFeatureOperand(
  value: CSSMediaFeatureValue,
  builder: StylesheetBuilder,
): MediaFeatureOperand | undefined {
  return value.type === "env"
    ? undefined
    : (parseMediaFeatureValue(value, builder) ?? null);
}

function parseMediaFeatureValue(
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

function parseMediaFeatureOperator(
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
