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

type MediaFeatureName = MediaFeatureNameFor_MediaFeatureId | "dir";

type MediaComparison = [
  MediaFeatureComparison,
  MediaFeatureName,
  MediaFeatureOperand,
];

/** Bits per color component. React Native renders to a color display. */
const COLOR_DEPTH = 8;

export function testMediaQuery(mediaQueries: MediaCondition[], get: Getter) {
  return mediaQueries.every((query) => test(query, get));
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

function test(mediaQuery: MediaCondition, get: Getter): Boolean {
  switch (mediaQuery[0]) {
    case "[]":
      return false;
    case "!!":
      return isTruthyFeatureValue(getMediaFeatureValue(mediaQuery[1], get));
    case "!":
      return !test(mediaQuery[1], get);
    case "&":
      return mediaQuery[1].every((query) => {
        return test(query, get);
      });
    case "|":
      return mediaQuery[1].some((query) => {
        return test(query, get);
      });
    case ">":
    case ">=":
    case "<":
    case "<=":
    case "=": {
      return testComparison(mediaQuery, get);
    }
  }
}

function testComparison(mediaQuery: MediaComparison, get: Getter): Boolean {
  const value = mediaQuery[2];

  // An operand the compiler could not resolve satisfies no comparison. Features
  // whose verdict does not read the value would otherwise match on nothing.
  if (value === null) {
    return false;
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

  if (typeof value !== "number") {
    return false;
  }

  const left = getMediaFeatureValue(mediaQuery[1], get);
  const right = value;

  if (typeof left !== "number") {
    return false;
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
