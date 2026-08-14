/* eslint-disable */
import { I18nManager, PixelRatio, Platform } from "react-native";

import type {
  MediaCondition,
  MediaFeatureComparison,
} from "react-native-css/compiler";

import { colorScheme, vh, vw, type Getter } from "../reactivity";
import {
  compareMediaFeature,
  testMediaFeatureInterval,
  type MediaInterval,
} from "./compare";

/**
 * The comparison arm of {@link MediaCondition}, derived from the union rather
 * than restated so it cannot drift from the compiler's output.
 */
type MediaComparison = Extract<
  MediaCondition,
  [MediaFeatureComparison, ...unknown[]]
>;

/** The feature name a comparison or an interval condition is written against. */
type MediaFeatureName = MediaComparison[1] | MediaInterval[1];

export function testMediaQuery(mediaQueries: MediaCondition[], get: Getter) {
  return mediaQueries.every((query) => test(query, get));
}

function test(mediaQuery: MediaCondition, get: Getter): boolean {
  switch (mediaQuery[0]) {
    case "!!":
      return false;
    case "[]":
      return testMediaFeatureInterval(
        mediaQuery,
        getMediaFeatureValue(mediaQuery[1], get),
      );
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

function testComparison(mediaQuery: MediaComparison, get: Getter): boolean {
  const value = mediaQuery[2];

  switch (mediaQuery[1]) {
    case "dir":
      return (I18nManager.isRTL && value === "rtl") || value === "ltr";
    case "hover":
      return true;
    case "platform":
      return value === "native" || value === Platform.OS;
    case "prefers-color-scheme": {
      return value === get(colorScheme);
    }
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

  if (left === undefined) {
    return false;
  }

  return compareMediaFeature(mediaQuery[0], left, value);
}

/**
 * The features a range or interval condition can be written against — the
 * numeric ones. A feature this cannot answer has nothing to compare, so both
 * arms treat it as no match rather than guessing a value for it.
 */
function getMediaFeatureValue(
  name: MediaFeatureName,
  get: Getter,
): number | undefined {
  switch (name) {
    case "width":
      return get(vw);
    case "height":
      return get(vh);
    case "aspect-ratio":
      return get(vw) / get(vh);
    case "resolution":
      return PixelRatio.get();
    default:
      return undefined;
  }
}
