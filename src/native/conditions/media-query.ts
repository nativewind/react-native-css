/* eslint-disable */
import { PixelRatio, Platform } from "react-native";

import type { MediaCondition } from "react-native-css/compiler";

import { colorScheme, vh, vw, type Getter } from "../reactivity";
import {
  isDeclaredByAncestor,
  NO_DECLARATIONS,
  resolveDeclaredDirectionality,
  resolveDirectionality,
  resolveRootDirectionality,
  type ElementDirectionality,
} from "./directionality";

export function testMediaQuery(
  mediaQueries: MediaCondition[],
  get: Getter,
  element: ElementDirectionality = NO_DECLARATIONS,
) {
  return mediaQueries.every((query) => test(query, get, element));
}

function test(
  mediaQuery: MediaCondition,
  get: Getter,
  element: ElementDirectionality,
): Boolean {
  switch (mediaQuery[0]) {
    case "[]":
    case "!!":
      return false;
    case "!":
      return !test(mediaQuery[1], get, element);
    case "&":
      return mediaQuery[1].every((query) => {
        return test(query, get, element);
      });
    case "|":
      return mediaQuery[1].some((query) => {
        return test(query, get, element);
      });
    case ">":
    case ">=":
    case "<":
    case "<=":
    case "=": {
      return testComparison(mediaQuery, get, element);
    }
  }
}

function testComparison(
  mediaQuery: MediaCondition,
  get: Getter,
  element: ElementDirectionality,
): Boolean {
  const value = mediaQuery[2];

  switch (mediaQuery[1]) {
    case "dir":
      return value === resolveDirectionality(element);
    case "root-dir":
      return value === resolveRootDirectionality();
    case "ancestor-dir": {
      const direction = resolveDeclaredDirectionality(value);
      return (
        direction !== undefined && isDeclaredByAncestor(element, direction)
      );
    }
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

  let left: number | undefined;
  const right = value;

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
