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
    case "==":
      return testRange(mediaQuery, effect);
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
    default:
      return testPlain(mediaQuery, effect);
  }
}

function testPlain(
  mediaQuery: Extract<MediaCondition, ["=", ...any[]]>,
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
  mediaQuery: Extract<MediaCondition, ["==", ...any[]]>,
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

  switch (mediaQuery[3]) {
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
      mediaQuery[3] satisfies never;
      return false;
  }
}
