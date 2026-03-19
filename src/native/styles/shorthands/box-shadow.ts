import type { StyleDescriptor } from "react-native-css/compiler";
import { isStyleDescriptorArray } from "react-native-css/utilities";

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

  // A flat array of primitives (e.g. [0, 4, 6, -1, "#000"]) is a single shadow
  // resolved from a runtime variable. Pass it directly to the pattern handler.
  // A nested array (e.g. [[0, 4, 6, -1, "#000"], [...]]) is multiple shadows.
  if (args.length > 0 && !Array.isArray(args[0])) {
    const result = handler(resolveValue, args, get, options);
    if (result === undefined) {
      return [];
    }
    const filtered = omitTransparentShadows(result);
    return filtered !== undefined ? [normalizeInsetValue(filtered)] : [];
  }

  return args
    .flatMap(flattenShadowDescriptor)
    .map((shadows) => {
      if (shadows === undefined) {
        return;
      } else {
        return normalizeInsetValue(
          omitTransparentShadows(handler(resolveValue, shadows, get, options)),
        );
      }
    })
    .filter((v) => v !== undefined);
};

function flattenShadowDescriptor(arg: StyleDescriptor): StyleDescriptor[] {
  if (isStyleDescriptorArray(arg) && isStyleDescriptorArray(arg[0])) {
    return arg.map((arg) => {
      return flattenShadowDescriptor(arg);
    });
  }

  return [arg];
}

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
