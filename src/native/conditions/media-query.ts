/* eslint-disable */
import { I18nManager, PixelRatio, Platform } from "react-native";

import type { MediaCondition } from "react-native-css/compiler";

import {
  colorScheme,
  vh,
  vw,
  windowQueryFamily,
  type Getter,
} from "../reactivity";

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
      return typeof value === "number" && windowQuery(get, "vw>=", value);
    case "max-width":
      return typeof value === "number" && windowQuery(get, "vw<=", value);
    case "min-height":
      return typeof value === "number" && windowQuery(get, "vh>=", value);
    case "max-height":
      return typeof value === "number" && windowQuery(get, "vh<=", value);
    case "orientation":
      return value === "landscape"
        ? windowQuery(get, "landscape", 0)
        : !windowQuery(get, "landscape", 0);
  }

  if (typeof value !== "number") {
    return false;
  }

  switch (mediaQuery[1]) {
    case "width":
      return windowQuery(get, `vw${mediaQuery[0]}`, value);
    case "height":
      return windowQuery(get, `vh${mediaQuery[0]}`, value);
    case "resolution":
      return compare(PixelRatio.get(), mediaQuery[0], value);
    default:
      return false;
  }
}

function compare(left: number, operator: string, right: number): boolean {
  switch (operator) {
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

/**
 * The answer of a comparison with the window's size (`vw` or `vh`, then the
 * operator), read through its own observable, so the caller is told only when
 * the answer changes (`windowQueryFamily`).
 */
function windowQuery(get: Getter, query: string, value: number): boolean {
  return get(
    windowQueryFamily(`${query}${value}`, {
      read: (read) =>
        query === "landscape"
          ? read(vh) < read(vw)
          : compare(
              read(query.startsWith("vw") ? vw : vh),
              query.slice(2),
              value,
            ),
    }),
  );
}
