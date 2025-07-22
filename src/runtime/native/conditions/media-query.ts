/* eslint-disable */
import { PixelRatio, Platform } from "react-native";

import type { MediaCondition } from "../../../compiler";
import { colorScheme, vh, vw, type Effect } from "../reactivity";

export function testMediaQuery(mediaQueries: MediaCondition[], effect: Effect) {
  return mediaQueries.every((query) => test(query, effect));
}

function test(mediaQuery: MediaCondition, effect: Effect): Boolean {
  switch (mediaQuery[0]) {
    case "[]":
    case "!!":
      return false;
    case "!":
      return !test(mediaQuery[1], effect);
    case "&":
      return mediaQuery[1].every((query) => {
        return test(query, effect);
      });
    case "|":
      return mediaQuery[1].some((query) => {
        return test(query, effect);
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
    case "platform":
      return right === Platform.OS;
    case "prefers-color-scheme": {
      return right === colorScheme.get(effect);
    }
    case "display-mode":
      return right === "native" || Platform.OS === right;
    case "min-width":
      return typeof right === "number" && vw.get(effect) >= right;
    case "max-width":
      return typeof right === "number" && vw.get(effect) <= right;
    case "min-height":
      return typeof right === "number" && vh.get(effect) >= right;
    case "max-height":
      return typeof right === "number" && vh.get(effect) <= right;
    case "orientation":
      return right === "landscape"
        ? vh.get(effect) < vw.get(effect)
        : vh.get(effect) >= vw.get(effect);
  }

  if (typeof right !== "number") {
    return false;
  }

  switch (mediaQuery[1]) {
    case "width":
      left = vw.get(effect);
      break;
    case "height":
      left = vh.get(effect);
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
