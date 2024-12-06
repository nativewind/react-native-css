import { PixelRatio, Platform } from "react-native";

import type { MediaCondition } from "../../../compiler";
import { appColorScheme, vh, vw } from "../globals";
import { Effect } from "../utils/observable";

export function testMediaQuery(
  mediaQueries: MediaCondition[],
  weakKey: WeakKey,
  effect: Effect,
) {
  return mediaQueries.every((query) => {
    return testMediaQueryCondition(query, weakKey, effect);
  });
}

function testMediaQueryCondition(
  mediaQuery: MediaCondition,
  weakKey: WeakKey,
  effect: Effect,
): Boolean {
  switch (mediaQuery[0]) {
    case "[]":
    case "!!":
      return false;
    case "!":
      return !testMediaQueryCondition(mediaQuery[1], weakKey, effect);
    case "&":
      return mediaQuery[1].every((query) => {
        return testMediaQueryCondition(query, weakKey, effect);
      });
    case "|":
      return mediaQuery[1].some((query) => {
        return testMediaQueryCondition(query, weakKey, effect);
      });
    case ">":
    case ">=":
    case "<":
    case "<=":
    case "=": {
      return testComparison(mediaQuery, effect);
    }
  }
}

function testComparison(mediaQuery: MediaCondition, effect: Effect): Boolean {
  let left: number | undefined;
  const right = mediaQuery[2];

  switch (mediaQuery[1]) {
    case "prefers-color-scheme": {
      return right === effect.get(appColorScheme);
    }
    case "display-mode":
      return right === "native" || Platform.OS === right;
    case "min-width":
      return typeof right === "number" && effect.get(vw) >= right;
    case "max-width":
      return typeof right === "number" && effect.get(vw) <= right;
    case "min-height":
      return typeof right === "number" && effect.get(vh) >= right;
    case "max-height":
      return typeof right === "number" && effect.get(vh) <= right;
    case "orientation":
      return right === "landscape"
        ? effect.get(vh) < effect.get(vw)
        : effect.get(vh) >= effect.get(vw);
  }

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
