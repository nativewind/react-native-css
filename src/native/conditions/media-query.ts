import { I18nManager, PixelRatio, Platform } from "react-native";

import type {
  MediaCondition,
  MediaFeatureComparison,
} from "react-native-css/compiler";

import {
  colorScheme,
  hoverCapableInput,
  vh,
  vw,
  type Getter,
} from "../reactivity";
import {
  compareMediaFeature,
  isTruthyFeatureValue,
  testMediaFeatureInterval,
  type MeasuredFeatureValue,
} from "./compare";
import {
  conjoin,
  disjoin,
  matches,
  negate,
  UNKNOWN,
  type Truth,
} from "./kleene";

type MediaComparison = Extract<
  MediaCondition,
  [MediaFeatureComparison, ...unknown[]]
>;

type MediaFeatureName = MediaComparison[1];

// The color feature counts bits per color component
const BITS_PER_COLOR_COMPONENT = 8;

export function testMediaQuery(mediaQueries: MediaCondition[], get: Getter) {
  return mediaQueries.every((query) => matches(test(query, get)));
}

function test(mediaQuery: MediaCondition, get: Getter): Truth {
  switch (mediaQuery[0]) {
    case "?":
      return UNKNOWN;
    case "!!":
      return isTruthyFeatureValue(getMediaFeatureValue(mediaQuery[1], get));
    case "[]":
      return testMediaFeatureInterval(
        mediaQuery,
        getMediaFeatureValue(mediaQuery[1], get),
      );
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
    case "=":
      return testComparison(mediaQuery, get);
    default:
      mediaQuery satisfies never;
      return UNKNOWN;
  }
}

function testComparison(mediaQuery: MediaComparison, get: Getter): Truth {
  const [operator, name, value] = mediaQuery;

  switch (name) {
    // dir and platform are this library's conditions rather than media features, so neither has a boolean context
    case "dir":
      return compareMediaFeature(
        operator,
        I18nManager.isRTL ? "rtl" : "ltr",
        value,
      );
    case "platform":
    case "display-mode":
      return (
        value === "native" || compareMediaFeature(operator, Platform.OS, value)
      );
    default:
      return compareMediaFeature(
        operator,
        getMediaFeatureValue(name, get),
        value,
      );
  }
}

function getMediaFeatureValue(
  name: MediaFeatureName,
  get: Getter,
): MeasuredFeatureValue {
  switch (name) {
    // A touchscreen, the input of iOS and Android until a pointer hovers, cannot hover (MQ5 §7.2, §7.3)
    case "hover":
    case "any-hover":
      return get(hoverCapableInput) ||
        (Platform.OS !== "ios" && Platform.OS !== "android")
        ? "hover"
        : "none";
    case "display-mode":
      return Platform.OS;
    case "prefers-color-scheme":
      return get(colorScheme) ?? undefined;
    case "color":
      return BITS_PER_COLOR_COMPONENT;
    // A React Native screen is a full-color bitmap that redraws as fast as scripts change it
    case "color-index":
    case "monochrome":
    case "grid":
      return 0;
    case "scripting":
      return "enabled";
    case "update":
      return "fast";
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
