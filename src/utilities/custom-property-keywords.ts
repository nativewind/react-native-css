import type { StyleFunction } from "react-native-css/compiler";

import { isStyleFunction } from "./style-descriptor";

// css-variables-1 §2: a custom property set to a CSS-wide keyword takes the keyword's value itself, which `var()` then substitutes
const INHERITED_VALUE = "inherit";
const GUARANTEED_INVALID_VALUE = "initial";

/** The value of a custom property set to `inherit`, `unset`, `revert` or `revert-layer`: its parent's */
export function inheritedValue(): StyleFunction {
  return [{}, INHERITED_VALUE];
}

/** The value of a custom property set to `initial`: the guaranteed-invalid value, which no `var()` substitutes */
export function guaranteedInvalidValue(): StyleFunction {
  return [{}, GUARANTEED_INVALID_VALUE];
}

export function isInheritedValue(value: unknown): boolean {
  return (
    isStyleFunction(value) && value.length === 2 && value[1] === INHERITED_VALUE
  );
}

export function isGuaranteedInvalidValue(value: unknown): boolean {
  return (
    isStyleFunction(value) &&
    value.length === 2 &&
    value[1] === GUARANTEED_INVALID_VALUE
  );
}
