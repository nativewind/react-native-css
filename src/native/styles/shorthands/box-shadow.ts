import {
  isCommaList,
  isStyleDescriptorArray,
} from "react-native-css/utilities";

import type { StyleFunctionResolver } from "../resolve";
import { shorthandHandler } from "./_handler";

// "color" type accepts both strings ("#fff") and objects (PlatformColor from currentcolor).
// Using "string" here would reject platform color objects and silently drop the shadow.
const color = ["color", "color"] as const;
const offsetX = ["offsetX", "number"] as const;
const offsetY = ["offsetY", "number"] as const;
const blurRadius = ["blurRadius", "number"] as const;
const spreadDistance = ["spreadDistance", "number"] as const;
// Match the literal string "inset" - the array type checks if value is in array
const inset = ["inset", ["inset"]] as const;

const handler = shorthandHandler(
  [
    // Standard patterns (without inset)
    [offsetX, offsetY, blurRadius, spreadDistance],
    [offsetX, offsetY, blurRadius, spreadDistance, color],
    [color, offsetX, offsetY],
    [color, offsetX, offsetY, blurRadius, spreadDistance],
    [offsetX, offsetY, color],
    [offsetX, offsetY, blurRadius, color],
    // Inset patterns - "inset" keyword at the beginning
    [inset, offsetX, offsetY, blurRadius, spreadDistance],
    [inset, offsetX, offsetY, blurRadius, spreadDistance, color],
    [inset, offsetX, offsetY, blurRadius, color],
    [inset, color, offsetX, offsetY, blurRadius, spreadDistance],
  ],
  [],
  "object",
);

const alreadyResolved = (value: unknown) => value;

export const boxShadow: StyleFunctionResolver = (
  resolveValue,
  func,
  get,
  options,
) => {
  const args = resolveValue(func[2]);

  if (!isStyleDescriptorArray(args)) {
    return args;
  }

  // A flat array of tokens (e.g. [0, 4, 6, -1, "#000"]) is a single shadow,
  // written out or substituted from a variable. An array of arrays
  // (e.g. [[0, 4, 6, -1, "#000"], [...]]) is a comma-separated list, one
  // shadow per item. The compiler keeps the separator via the nested array.
  const shadows = isCommaList(args) ? args : [args];
  const result: unknown[] = [];

  for (const shadow of shadows) {
    const value = normalizeInsetValue(
      // alreadyResolved rather than resolveValue: don't walk through tokens and resolve all shadows when we've already resolved this one
      omitTransparentShadows(handler(alreadyResolved, shadow, get, options)),
    );
    if (value !== undefined) result.push(value);
  }

  return result;
};

function omitTransparentShadows(style: unknown) {
  if (typeof style === "object" && style && "color" in style) {
    if (style.color === "#0000" || style.color === "transparent") {
      return;
    }
  }

  return style;
}

/**
 * Convert inset: "inset" to inset: true for React Native boxShadow.
 *
 * The shorthand handler matches the literal "inset" string and assigns it as the value.
 * React Native's boxShadow expects inset to be a boolean.
 */
function normalizeInsetValue(style: unknown) {
  if (typeof style === "object" && style && "inset" in style) {
    return { ...style, inset: true };
  }

  return style;
}
