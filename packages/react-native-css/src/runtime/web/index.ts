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
