/* eslint-disable */
import { PixelRatio, Platform } from "react-native";

import type { MediaCondition } from "../../../compiler";
import { colorScheme, vh, vw, type Getter } from "../reactivity";

export function testMediaQuery(mediaQueries: MediaCondition[], get: Getter) {
  return mediaQueries.every((query) => test(query, get));
}

function test(mediaQuery: MediaCondition, get: Getter): Boolean {
  switch (mediaQuery[0]) {
    case "[]":
    case "!!":
      return false;
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

function testComparison(mediaQuery: MediaCondition, get: Getter): Boolean {
  let left: number | undefined;
  const right = mediaQuery[2];

  switch (mediaQuery[1]) {
    case "platform":
      return right === "native" || right === Platform.OS;
    case "prefers-color-scheme": {
      return right === get(colorScheme);
    }
    case "display-mode":
      return right === "native" || Platform.OS === right;
    case "min-width":
      return typeof right === "number" && get(vw) >= right;
    case "max-width":
      return typeof right === "number" && get(vw) <= right;
    case "min-height":
      return typeof right === "number" && get(vh) >= right;
    case "max-height":
      return typeof right === "number" && get(vh) <= right;
    case "orientation":
      return right === "landscape" ? get(vh) < get(vw) : get(vh) >= get(vw);
  }

  if (typeof right !== "number") {
    return false;
  }

  switch (mediaQuery[1]) {
    case "width":
      left = get(vw);
      break;
    case "height":
      left = get(vh);
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
