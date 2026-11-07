import type {
  StyleDescriptor,
  StyleFunction,
  StyleRule,
} from "react-native-css/compiler";

import { isInheritedValue } from "./custom-property-keywords";
import { isStyleFunction } from "./style-descriptor";

/** The custom property every `color` rule publishes to its subtree and `currentcolor` reads back */
export const INHERITED_COLOR_VARIABLE = "__rn-css-color";

// A fresh tuple per call, because a descriptor is owned by the rule it lands in
export function inheritedColorLookup() {
  return [{}, "var", INHERITED_COLOR_VARIABLE] as const satisfies StyleFunction;
}

export function isInheritedColorLookup(fn: StyleFunction): boolean {
  if (fn[1] !== "var") {
    return false;
  }

  const args = fn[2];
  const name = Array.isArray(args) ? args[0] : args;

  return name === INHERITED_COLOR_VARIABLE;
}

/** Assigns a rule's custom properties to the element's own, and returns the inherited colour it publishes for `assignPublishedColor` */
export function assignRuleVariables(
  variables: Record<string, unknown>,
  entries: NonNullable<StyleRule["v"]>,
): StyleDescriptor | undefined {
  return assignEntries(entries, (name, value) => {
    variables[name] = value;
  });
}

/** Assigns a rule's custom properties to what its subtree inherits, where one set to `inherit` hands down the parent's value */
export function assignSubtreeVariables(
  variables: Record<string, unknown>,
  entries: NonNullable<StyleRule["v"]>,
  parentVariables: Readonly<Record<string, unknown>>,
): StyleDescriptor | undefined {
  return assignEntries(entries, (name, value) => {
    if (!isInheritedValue(value)) {
      variables[name] = value;
    } else {
      variables[name] = Object.hasOwn(parentVariables, name)
        ? parentVariables[name]
        : undefined;
    }
  });
}

function assignEntries(
  entries: NonNullable<StyleRule["v"]>,
  assign: (name: string, value: StyleDescriptor) => void,
): StyleDescriptor | undefined {
  let color: StyleDescriptor | undefined;

  for (const [name, value] of entries) {
    if (name === INHERITED_COLOR_VARIABLE) {
      color = value;
    } else {
      assign(name, value);
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
