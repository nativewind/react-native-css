import type {
  CalcFor_Length,
  ContainerSizeFeatureId,
  MediaCondition as CSSMediaCondition,
  MediaFeatureComparison as CSSMediaFeatureComparison,
  MediaFeatureValue as CSSMediaFeatureValue,
  MediaQuery as CSSMediaQuery,
  MediaFeatureId,
  QueryFeatureFor_ContainerSizeFeatureId,
  QueryFeatureFor_MediaFeatureId,
  Ratio,
} from "lightningcss";

import { isStyleFunction } from "../utilities";
import { asciiLowerCase } from "../utilities/ascii-case";
import type { DeepReadonly } from "../utilities/deep-readonly.types";
import type {
  MediaCondition,
  MediaFeatureComparison,
  MediaFeatureName,
  MediaFeatureOperand,
  MediaFeatureRatio,
  MediaRatioFeatureName,
  StyleDescriptor,
} from "./compiler.types";
import { parseLength, safeNumber } from "./declarations";
import type { StylesheetBuilder } from "./stylesheet";

export function parseMediaQuery(
  query: DeepReadonly<CSSMediaQuery>,
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

export function parseMediaQueryCondition(
  query: DeepReadonly<CSSMediaCondition>,
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

type FeatureValueSyntax =
  | { readonly type: "keywords"; readonly keywords: readonly string[] }
  | {
      readonly type: "values";
      readonly values: readonly CSSMediaFeatureValue["type"][];
    };

const keywords = (...words: readonly string[]): FeatureValueSyntax => ({
  type: "keywords",
  keywords: words,
});

const values = (
  ...types: readonly CSSMediaFeatureValue["type"][]
): FeatureValueSyntax => ({ type: "values", values: types });

const LENGTH = values("length");
const RATIO = values("ratio");
const INTEGER = values("integer");

// The value each feature takes in Media Queries 5 and CSS Conditional 5, as lightningcss parses it; display-mode takes the platform names the library answers it with
const FEATURE_VALUES: ReadonlyMap<string, FeatureValueSyntax> = new Map<
  MediaFeatureId | ContainerSizeFeatureId,
  FeatureValueSyntax
>([
  ["width", LENGTH],
  ["height", LENGTH],
  ["inline-size", LENGTH],
  ["block-size", LENGTH],
  ["aspect-ratio", RATIO],
  ["orientation", keywords("portrait", "landscape")],
  ["overflow-block", keywords("none", "scroll", "paged")],
  ["overflow-inline", keywords("none", "scroll")],
  ["horizontal-viewport-segments", INTEGER],
  ["vertical-viewport-segments", INTEGER],
  ["display-mode", values("ident")],
  ["resolution", values("resolution")],
  ["scan", keywords("interlace", "progressive")],
  ["grid", values("boolean")],
  ["update", keywords("none", "slow", "fast")],
  ["environment-blending", keywords("opaque", "additive", "subtractive")],
  ["color", INTEGER],
  ["color-index", INTEGER],
  ["monochrome", INTEGER],
  ["color-gamut", keywords("srgb", "p3", "rec2020")],
  ["dynamic-range", keywords("standard", "high")],
  ["inverted-colors", keywords("none", "inverted")],
  ["pointer", keywords("none", "coarse", "fine")],
  ["hover", keywords("none", "hover")],
  ["any-pointer", keywords("none", "coarse", "fine")],
  ["any-hover", keywords("none", "hover")],
  ["nav-controls", keywords("none", "back")],
  ["video-color-gamut", keywords("srgb", "p3", "rec2020")],
  ["video-dynamic-range", keywords("standard", "high")],
  ["scripting", keywords("none", "initial-only", "enabled")],
  ["prefers-reduced-motion", keywords("no-preference", "reduce")],
  ["prefers-reduced-transparency", keywords("no-preference", "reduce")],
  ["prefers-contrast", keywords("no-preference", "less", "more", "custom")],
  ["forced-colors", keywords("none", "active")],
  ["prefers-color-scheme", keywords("light", "dark")],
  ["prefers-reduced-data", keywords("no-preference", "reduce")],
  ["device-width", LENGTH],
  ["device-height", LENGTH],
  ["device-aspect-ratio", RATIO],
  ["-webkit-device-pixel-ratio", values("number", "integer")],
  ["-moz-device-pixel-ratio", values("number", "integer")],
]);

function isMediaFeatureName(name: string): name is MediaFeatureName {
  return name === "dir" || name === "platform" || FEATURE_VALUES.has(name);
}

function isRatioFeatureName(
  name: MediaFeatureName,
): name is MediaRatioFeatureName {
  return name === "aspect-ratio" || name === "device-aspect-ratio";
}

// A feature neither lightningcss nor this library knows, or one holding a value outside its syntax, compiles to undefined, which a media query reads as unknown (MQ5 §3.2) and a container query as no query
export function parseQueryFeature(
  feature: DeepReadonly<
    QueryFeatureFor_MediaFeatureId | QueryFeatureFor_ContainerSizeFeatureId
  >,
  builder: StylesheetBuilder,
): MediaCondition | undefined {
  const name = feature.name;

  if (!isMediaFeatureName(name)) {
    return undefined;
  }

  switch (feature.type) {
    case "boolean":
      return ["!!", name];
    case "plain":
      return parseComparison("=", name, feature.value, builder);
    case "range":
      return parseComparison(
        parseMediaFeatureOperator(feature.operator),
        name,
        feature.value,
        builder,
      );
    case "interval":
      return parseInterval(
        name,
        feature.start,
        parseMediaFeatureOperator(feature.startOperator),
        feature.end,
        parseMediaFeatureOperator(feature.endOperator),
        builder,
      );
    default:
      feature satisfies never;
      return undefined;
  }
}

function parseComparison(
  operator: MediaFeatureComparison,
  name: MediaFeatureName,
  value: DeepReadonly<CSSMediaFeatureValue>,
  builder: StylesheetBuilder,
): MediaCondition | undefined {
  if (isRatioFeatureName(name)) {
    const ratio = parseRatioOperand(name, value);
    return ratio === undefined ? undefined : [operator, name, ratio];
  }

  const operand = parseFeatureOperand(name, value, builder);
  return operand === undefined ? undefined : [operator, name, operand];
}

function parseInterval(
  name: MediaFeatureName,
  start: DeepReadonly<CSSMediaFeatureValue>,
  startOperator: MediaFeatureComparison,
  end: DeepReadonly<CSSMediaFeatureValue>,
  endOperator: MediaFeatureComparison,
  builder: StylesheetBuilder,
): MediaCondition | undefined {
  if (isRatioFeatureName(name)) {
    const startRatio = parseRatioOperand(name, start);
    const endRatio = parseRatioOperand(name, end);
    return startRatio === undefined || endRatio === undefined
      ? undefined
      : ["[]", name, startRatio, startOperator, endRatio, endOperator];
  }

  const startOperand = parseFeatureOperand(name, start, builder);
  const endOperand = parseFeatureOperand(name, end, builder);
  return startOperand === undefined || endOperand === undefined
    ? undefined
    : ["[]", name, startOperand, startOperator, endOperand, endOperator];
}

function parseRatioOperand(
  name: MediaRatioFeatureName,
  value: DeepReadonly<CSSMediaFeatureValue>,
): MediaFeatureRatio | undefined {
  return value.type === "ratio" && !isOutsideValueSyntax(name, value)
    ? parseRatio(value.value)
    : undefined;
}

// A value inside the feature's syntax that the compiler cannot resolve compiles to null, which leaves its term unknown; a condition compares only a number, a keyword or a function the runtime resolves
function parseFeatureOperand(
  name: string,
  value: DeepReadonly<CSSMediaFeatureValue>,
  builder: StylesheetBuilder,
): MediaFeatureOperand | undefined {
  if (isOutsideValueSyntax(name, value)) {
    return undefined;
  }

  const operand = parseMediaFeatureValue(value, builder);

  return typeof operand === "number" ||
    typeof operand === "string" ||
    isStyleFunction(operand)
    ? operand
    : null;
}

// lightningcss's error recovery passes a value of a type its feature does not take through, which the three engines leave unknown
function isOutsideValueSyntax(
  name: string,
  value: DeepReadonly<CSSMediaFeatureValue>,
): boolean {
  // No browser takes env() as a media feature's value, and Chromium and WebKit drop a container query holding one
  if (value.type === "env") {
    return true;
  }

  // css-values-4 §7.4 excludes a negative resolution, as Chromium, Firefox and WebKit do in a media query
  if (value.type === "resolution" && value.value.value < 0) {
    return true;
  }

  // css-values-4 §5.7 excludes a negative ratio component, as Chromium, Firefox and WebKit do
  if (
    value.type === "ratio" &&
    value.value.some((component) => component < 0)
  ) {
    return true;
  }

  const syntax = FEATURE_VALUES.get(name);

  if (syntax === undefined) {
    return false;
  }

  switch (syntax.type) {
    case "keywords":
      return (
        value.type !== "ident" ||
        !syntax.keywords.includes(asciiLowerCase(value.value))
      );
    case "values":
      return !syntax.values.includes(value.type);
    default:
      syntax satisfies never;
      return false;
  }
}

// JSON writes Infinity as null, so an infinite number makes a ratio its limit, and every engine compares 0/0 as 1/0
function parseRatio([
  numerator,
  denominator,
]: DeepReadonly<Ratio>): MediaFeatureRatio {
  if (numerator === Infinity || denominator === Infinity) {
    return [numerator === Infinity ? 1 : 0, denominator === Infinity ? 1 : 0];
  }

  const ratio: MediaFeatureRatio = [
    writtenNumber(numerator),
    writtenNumber(denominator),
  ];

  return ratio[0] === 0 && ratio[1] === 0 ? [1, 0] : ratio;
}

// lightningcss hands a number over as a float32, and the shortest decimal that is the same float32 is the number the stylesheet wrote; NaN is 0 (css-values-4 §10.9.1)
function writtenNumber(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  for (let digits = 1; digits < 9; digits++) {
    const decimal = Number(value.toPrecision(digits));

    if (Math.fround(decimal) === value) {
      return decimal;
    }
  }

  return value;
}

function parseMediaFeatureValue(
  value: DeepReadonly<CSSMediaFeatureValue>,
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
      return safeNumber(value.value);
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
          return safeNumber(value.value.value / 160);
        case "dpcm":
          // There are 1in = ~2.54cm
          return safeNumber(value.value.value / (160 * 2.54));
        case "dppx":
          return safeNumber(value.value.value);
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
  calc: DeepReadonly<CalcFor_Length>,
  builder: StylesheetBuilder,
): StyleDescriptor {
  switch (calc.type) {
    case "number":
      return safeNumber(calc.value);
    case "value":
      return parseLength(calc.value, builder);
    case "sum":
      return [{}, "sum", calc.value.map((c) => parseCalcFn(c, builder))];
    case "product":
      return [
        {},
        "product",
        [safeNumber(calc.value[0]), parseCalcFn(calc.value[1], builder)],
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
