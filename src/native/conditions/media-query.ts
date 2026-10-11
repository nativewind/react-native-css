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

type MediaComparison = Extract<
  MediaCondition,
  [MediaFeatureComparison, ...unknown[]]
>;

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
      return value === (I18nManager.isRTL ? "rtl" : "ltr");
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

  return compareMediaFeature(
    mediaQuery[0],
    getMediaFeatureValue(mediaQuery[1], get),
    value,
  );
}

function getMediaFeatureValue(
  name: MediaFeatureName,
  get: Getter,
): number | undefined {
  switch (name) {
    case "width":
      return get(vw);
    case "height":
      return get(vh);
    case "resolution":
      return PixelRatio.get();
    default:
      return undefined;
  }
}
