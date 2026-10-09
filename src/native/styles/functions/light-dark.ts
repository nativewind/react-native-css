import { isStyleDescriptorArray } from "react-native-css/utilities";

import { colorScheme } from "../../reactivity";
import type { StyleFunctionResolver } from "../resolve";

/**
 * CSS Color 5 `light-dark()`: the first colour unless the used colour scheme is dark. Only
 * that branch is resolved, so the element reads the other branch's variables only once the
 * scheme changes
 */
export const lightDark: StyleFunctionResolver = (resolveValue, value, get) => {
  const branches = value[2];

  if (!isStyleDescriptorArray(branches) || branches.length !== 2) {
    return;
  }

  return resolveValue(get(colorScheme) === "dark" ? branches[1] : branches[0]);
};
