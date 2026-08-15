/* eslint-disable */
import { I18nManager, PixelRatio, Platform } from "react-native";

import type { MediaFeatureNameFor_MediaFeatureId } from "lightningcss";
import type {
  MediaCondition,
  MediaFeatureComparison,
  MediaFeatureOperand,
  StyleDescriptor,
} from "react-native-css/compiler";

import { colorScheme, vh, vw, type Getter } from "../reactivity";
import {
  conjoin,
  disjoin,
  matches,
  negate,
  UNKNOWN,
  type Truth,
} from "./kleene";

type MediaFeatureName = MediaFeatureNameFor_MediaFeatureId | "dir";

type MediaComparison = [
  MediaFeatureComparison,
  MediaFeatureName,
  MediaFeatureOperand,
];

/** Bits per color component. React Native renders to a color display. */
const COLOR_DEPTH = 8;

export function testMediaQuery(mediaQueries: MediaCondition[], get: Getter) {
  // An @media rule is a two-valued context, so MQ5 § 3.1 converts unknown to
  // false here and nowhere earlier.
  return mediaQueries.every((query) => matches(test(query, get)));
}

/**
 * Whether a feature is true in a boolean context, which is every value except
 * zero, `none` and `false`. A feature the runtime cannot answer has no value
 * and is false.
 */
export function isTruthyFeatureValue(value: StyleDescriptor): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value) && value !== 0;
  }

  return value !== undefined && value !== false && value !== "none";
}

function test(mediaQuery: MediaCondition, get: Getter): Truth {
  switch (mediaQuery[0]) {
    case "?":
      // Unreachable on this plane with the installed lightningcss: `["?"]` is
      // emitted for a container `style()` query, which `@media` cannot carry,
      // and `@media (fictional-thing)` parses as the boolean feature
      // `["!!", "fictional-thing"]` rather than as MQ5's `<general-enclosed>`.
      // The arm is kept rather than deleted because both halves of that are
      // properties of the parser rather than of the grammar: a lightningcss
      // that reports `<general-enclosed>` makes this the arm that answers it,
      // and the answer it already gives is the right one.
      return UNKNOWN;
    case "[]":
      // An interval this runtime does not evaluate has no answer, rather than
      // the answer `false`.
      return UNKNOWN;
    case "!!": {
      const featureValue = getMediaFeatureValue(mediaQuery[1], get);
      return featureValue === undefined
        ? UNKNOWN
        : isTruthyFeatureValue(featureValue);
    }
    case "!":
      return negate(test(mediaQuery[1], get));
    case "&":
      return conjoin(mediaQuery[1], (query) => test(query, get));
    case "|":
      return disjoin(mediaQuery[1], (query) => test(query, get));
    case ">":
    case ">=":
    case "<":
    case "<=":
    case "=": {
      return testComparison(mediaQuery, get);
    }
  }
}

function testComparison(mediaQuery: MediaComparison, get: Getter): Truth {
  const value = mediaQuery[2];

  // An operand with no compile-time answer leaves the comparison unknown, not
  // false - MQ5 § 3.1. Collapsing it to false here is what would make
  // `not (min-width: env(safe-area-inset-left))` match.
  if (value === null) {
    return UNKNOWN;
  }

  switch (mediaQuery[1]) {
    case "dir":
      return (I18nManager.isRTL && value === "rtl") || value === "ltr";
    case "hover":
    case "prefers-color-scheme":
      return value === getMediaFeatureValue(mediaQuery[1], get);
    case "platform":
      return value === "native" || value === Platform.OS;
    case "display-mode":
      return value === "native" || Platform.OS === value;
    case "min-width":
      return typeof value === "number" && get(vw) >= value;
    case "max-width":
      return typeof value === "number" && get(vw) <= value;
    case "min-height":
      return typeof value === "number" && get(vh) >= value;
    case "max-height":
      return typeof value === "number" && get(vh) <= value;
    case "orientation":
      return value === "landscape" ? get(vh) < get(vw) : get(vh) >= get(vw);
  }

  // A length the compiler could not fold reaches here as a descriptor rather
  // than a number: `(width > 10em)` compiles to `[{}, "em", 10, 1]`, because
  // `em` is relative to the element's own font size. Ordering it gives `NaN`,
  // which is false for every operator - and false is the one answer a negation
  // turns into a match.
  if (typeof value !== "number") {
    return UNKNOWN;
  }

  const left = getMediaFeatureValue(mediaQuery[1], get);
  const right = value;

  // A feature this runtime cannot measure is unknown, which is what MQ5 § 3.2
  // assigns an unknown <mf-name>.
  if (typeof left !== "number") {
    return UNKNOWN;
  }

  switch (mediaQuery[0]) {
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
      return false;
  }
}

/** The runtime's current value for a media feature, if it has one. */
function getMediaFeatureValue(
  name: MediaFeatureName,
  get: Getter,
): StyleDescriptor {
  switch (name) {
    case "dir":
      return I18nManager.isRTL ? "rtl" : "ltr";
    case "hover":
      // A deviation from MQ5 5.1, where `none` covers a touchscreen. React
      // Native raises `onHoverIn` / `onHoverOut` wherever a pointer exists, and
      // the `hover:` variant of a utility framework compiles to this feature, so
      // the runtime answers `hover` on every platform rather than switching on
      // the primary input mechanism it cannot see.
      return "hover";
    case "platform":
    case "display-mode":
      return Platform.OS;
    case "prefers-color-scheme":
      // MQ5 12.5: `light` covers a user who has expressed no preference.
      return get(colorScheme) ?? "light";
    case "color":
      return COLOR_DEPTH;
    case "width":
      return get(vw);
    case "height":
      return get(vh);
    case "resolution":
      return PixelRatio.get();
    case "orientation":
      return get(vh) < get(vw) ? "landscape" : "portrait";
    default:
      return undefined;
  }
}
