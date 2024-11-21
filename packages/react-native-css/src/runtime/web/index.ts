import { ColorSchemeName } from "react-native";

import { Observable } from "../native/utils/observable";
import type { ColorScheme, JSXFunction, Styled } from "../runtime.types";

export type * from "../runtime.types";

export const interopComponents = new Map<
  object | string,
  Parameters<JSXFunction>[0]
>();

export const styled: Styled = (baseComponent, mapping) => {
  return () => null;
};

export const colorScheme: ColorScheme = {
  get() {
    return "light";
  },
  set() {
    return;
  },
};

export function vars<T extends Record<`--${string}`, string | number>>(
  variables: T,
) {
  const $variables: Record<string, string> = {};

  for (const [key, value] of Object.entries(variables)) {
    if (key.startsWith("--")) {
      $variables[key] = value.toString();
    } else {
      $variables[`--${key}`] = value.toString();
    }
  }
  return $variables;
}
