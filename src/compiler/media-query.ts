/* eslint-disable */
import type {
  CalcFor_Length,
  MediaCondition as CSSMediaCondition,
  MediaFeatureComparison as CSSMediaFeatureComparison,
  MediaFeatureValue as CSSMediaFeatureValue,
  MediaQuery as CSSMediaQuery,
  QueryFeatureFor_MediaFeatureId,
} from "lightningcss";

import type {
  MediaCondition,
  MediaFeatureComparison,
  StyleDescriptor,
} from "./compiler.types";
import { parseLength, type ParserOptions } from "./declarations";

export function parseMediaQuery(
  query: CSSMediaQuery,
  options: ParserOptions,
): MediaCondition | undefined {
  let platformCondition: MediaCondition | undefined;
  let condition: MediaCondition | undefined;

  if (query.mediaType) {
    // Print is for printing documents
    if (query.mediaType === "print") {
      return;
    }

    // These all/screen are not conditions, they always apply
    if (query.mediaType !== "all" && query.mediaType !== "screen") {
      platformCondition = ["=", "platform", query.mediaType];
    }
  }

  if (query.condition) {
    condition = parseMediaQueryCondition(query.condition, options);

    // If any of these are undefined, the media query is invalid
    if (!condition || condition.some((v) => v === undefined)) {
      return;
    }
  }

  let mediaQuery: MediaCondition | undefined =
    platformCondition && condition
      ? ["&", [platformCondition, condition]]
      : platformCondition || condition;

  if (!mediaQuery) {
    return;
  }

  if (query.qualifier === "not") {
    mediaQuery = ["!", mediaQuery];
  }

  return mediaQuery;
}

function parseMediaQueryCondition(
  query: CSSMediaCondition,
  options: ParserOptions,
): MediaCondition | undefined {
  switch (query.type) {
    case "feature":
      return parseFeature(query.value, options);
    case "not":
      const mediaQuery = parseMediaQueryCondition(query.value, options);
      return mediaQuery ? ["!", mediaQuery] : undefined;
    case "operation":
      const mediaQueries = query.conditions
        .map((c) => parseMediaQueryCondition(c, options))
        .filter((v): v is MediaCondition => !!v);

      if (mediaQueries.length === 0) {
        return;
      }

      switch (query.operator) {
        case "and":
          return ["&", mediaQueries];
        case "or":
          return ["|", mediaQueries];
        default:
          query.operator satisfies never;
          return;
      }
    default:
      query satisfies never;
  }

  return;
}

function parseFeature(
  feature: QueryFeatureFor_MediaFeatureId,
  options: ParserOptions,
): MediaCondition | undefined {
  switch (feature.type) {
    case "boolean":
      return ["!!", feature.name];
    case "plain":
      return [
        "=",
        feature.name,
        parseMediaFeatureValue(feature.value, options),
      ];
    case "range":
      return [
        parseMediaFeatureOperator(feature.operator),
        feature.name,
        parseMediaFeatureValue(feature.value, options),
      ];
    case "interval":
      return [
        "[]",
        feature.name,
        parseMediaFeatureValue(feature.start, options),
        parseMediaFeatureOperator(feature.startOperator),
        parseMediaFeatureValue(feature.end, options),
        parseMediaFeatureOperator(feature.endOperator),
      ];
    default:
      feature satisfies never;
  }
  return;
}

export function parseMediaFeatureValue(
  value: CSSMediaFeatureValue,
  options: ParserOptions,
): StyleDescriptor {
  switch (value.type) {
    case "boolean":
    case "ident":
    case "integer":
    case "number":
      return value.value;
    case "length":
      switch (value.value.type) {
        case "value":
          return parseLength(value.value.value, options);
        case "calc":
          return parseCalcFn(value.value.value, options);
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
  }

  return;
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
      throw new Error(`Unknown MediaFeatureComparison operator ${operator}`);
  }
}

function parseCalcFn(
  calc: CalcFor_Length,
  options: ParserOptions,
): StyleDescriptor {
  switch (calc.type) {
    case "number":
      return calc.value;
    case "value":
      return parseLength(calc.value, options);
    case "sum":
      return [{}, "sum", calc.value.map((c) => parseCalcFn(c, options))];
    case "product":
      return [
        {},
        "product",
        [calc.value[0], parseCalcFn(calc.value[1], options)],
      ];
    case "function":
      switch (calc.value.type) {
        case "calc":
          return parseCalcFn(calc.value.value, options);
        case "min":
        case "max":
        case "clamp":
        case "rem":
        case "mod":
        case "hypot":
          return [
            {},
            calc.value.type,
            calc.value.value.map((c) => parseCalcFn(c, options)),
          ];
        case "abs":
        case "sign":
          return [
            {},
            calc.value.type,
            [parseCalcFn(calc.value.value, options)],
          ];
        case "round":
          return [
            {},
            calc.value.type,
            [
              calc.value.value[0],
              parseCalcFn(calc.value.value[1], options),
              parseCalcFn(calc.value.value[2], options),
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
