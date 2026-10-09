import type {
  StyleDescriptor,
  StyleFunction,
  StyleRule,
} from "react-native-css/compiler";

import { isStyleFunction } from "./style-descriptor";

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

/** Assigns a rule's custom properties, and returns the inherited colour it publishes for `assignPublishedColor` */
export function assignRuleVariables(
  variables: Record<string, unknown>,
  entries: NonNullable<StyleRule["v"]>,
): StyleDescriptor | undefined {
  let color: StyleDescriptor | undefined;

  for (const [name, value] of entries) {
    if (name === INHERITED_COLOR_VARIABLE) {
      color = value;
    } else {
      variables[name] = value;
    }
  }

  return color;
}

// The last rule's colour is the element's, and one that reads the inherited colour leaves the inherited one in place, as CSS inherits a computed value
export function assignPublishedColor(
  variables: Record<string, unknown>,
  color: StyleDescriptor | undefined,
): void {
  if (
    color !== undefined &&
    !(isStyleFunction(color) && isInheritedColorLookup(color))
  ) {
    variables[INHERITED_COLOR_VARIABLE] = color;
  }
}
