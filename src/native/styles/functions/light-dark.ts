import {
  COLOR_SCHEME_VARIABLE,
  isStyleDescriptorArray,
  resolveUsedColorScheme,
} from "react-native-css/utilities";

import { colorScheme } from "../../reactivity";
import type { StyleFunctionResolver } from "../resolve";

/** CSS Color 5 §7: the first colour unless the element's used colour scheme is dark; only the chosen arm is resolved */
export const lightDark: StyleFunctionResolver = (resolveValue, value, get) => {
  const branches = value[2];

  if (!isStyleDescriptorArray(branches) || branches.length !== 2) {
    return;
  }

  const usedColorScheme = resolveUsedColorScheme(
    resolveValue([{}, "var", COLOR_SCHEME_VARIABLE]),
    get(colorScheme),
  );

  return resolveValue(usedColorScheme === "dark" ? branches[1] : branches[0]);
};
