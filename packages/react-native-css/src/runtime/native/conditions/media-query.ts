import { PixelRatio, Platform } from "react-native";

import { MediaFeatureComparison, MediaQuery } from "../../runtime.types";
import { appColorScheme, vh, vw } from "../globals";
import { Effect } from "../utils/observable";

export function testMediaQueries(
  mediaQueries: MediaQuery[],
  weakKey: WeakKey,
  effect: Effect,
) {
  return mediaQueries.every((query) => testMediaQuery(query, weakKey, effect));
}

function testMediaQuery(
  mediaQuery: MediaQuery,
  weakKey: WeakKey,
  effect: Effect,
): Boolean {
  switch (mediaQuery[0]) {
    case "==":
      return testRange(mediaQuery, effect);
    case "[]":
    case "!!":
      return false;
    case "!":
      return !testMediaQuery(mediaQuery[1], weakKey, effect);
    case "&":
      return mediaQuery[1].every((query) => {
        return testMediaQuery(query, weakKey, effect);
      });
    case "|":
      return mediaQuery[1].some((query) => {
        return testMediaQuery(query, weakKey, effect);
      });
    default:
      return testPlain(mediaQuery, effect);
  }
}

function testPlain(
  mediaQuery: Extract<MediaQuery, ["=", ...any[]]>,
  effect: Effect,
) {
  const value = mediaQuery[2];

  switch (mediaQuery[1]) {
    case "prefers-color-scheme": {
      return value === effect.get(appColorScheme);
    }
    case "resolution":
      return value === PixelRatio.get();
    case "display-mode":
      return value === "native" || Platform.OS === value;
    case "width":
      return typeof value === "number" && effect.get(vw) === value;
    case "min-width":
      return typeof value === "number" && effect.get(vw) >= value;
    case "max-width":
      return typeof value === "number" && effect.get(vw) <= value;
    case "height":
      return typeof value === "number" && effect.get(vh) === value;
    case "min-height":
      return typeof value === "number" && effect.get(vh) >= value;
    case "max-height":
      return typeof value === "number" && effect.get(vh) <= value;
    case "orientation":
      return value === "landscape"
        ? effect.get(vh) < effect.get(vw)
        : effect.get(vh) >= effect.get(vw);
    default: {
      return false;
    }
  }
}

function testRange(
  mediaQuery: Extract<MediaQuery, ["==", ...any[]]>,
  effect: Effect,
) {
  const right = mediaQuery[2];
  let left: number | undefined;

  if (typeof right !== "number") {
    return false;
  }

  switch (mediaQuery[1]) {
    case "width":
      left = effect.get(vw);
      break;
    case "height":
      left = effect.get(vh);
      break;
    case "resolution":
      left = PixelRatio.get();
      break;
    default:
      return false;
  }

  return testComparison(mediaQuery[3], left, right);
}

function testComparison(
  comparison: MediaFeatureComparison,
  left: number,
  right: number,
) {
  switch (comparison) {
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
      comparison satisfies never;
      return false;
  }
}
