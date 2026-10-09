import type { StyleFunction } from "react-native-css/compiler";

/** The custom property every `color` rule publishes to its subtree and `currentcolor` reads back */
export const INHERITED_COLOR_VARIABLE = "__rn-css-color";

export function isInheritedColorLookup(fn: StyleFunction): boolean {
  if (fn[1] !== "var") {
    return false;
  }

  const args = fn[2];
  const name = Array.isArray(args) ? args[0] : args;

  return name === INHERITED_COLOR_VARIABLE;
}
