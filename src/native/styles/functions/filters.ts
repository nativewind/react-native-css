import {
  isStyleDescriptorArray,
  readAngle,
  readNonNegativeAmount,
  readNonNegativeLength,
} from "react-native-css/utilities";

import { resetsToNone } from "../resets-to-none";
import type { StyleFunctionResolver } from "../resolve";
import { shorthandHandler } from "../shorthands/_handler";

type FilterArgumentReader = (argument: unknown) => unknown;

// Filter Effects 1: a filter function takes one argument, so one given several is invalid
function readFilterArgument(args: unknown): unknown {
  if (!Array.isArray(args)) {
    return args;
  }

  return args.length === 1 ? args[0] : undefined;
}

function filterFunction(
  name: string,
  readArgument: FilterArgumentReader,
): StyleFunctionResolver {
  return (resolveValue, value) => {
    const argument = readArgument(readFilterArgument(resolveValue(value[2])));
    return argument === undefined ? undefined : { [name]: argument };
  };
}

export const blur = filterFunction("blur", readNonNegativeLength);
export const brightness = filterFunction("brightness", readNonNegativeAmount);
export const contrast = filterFunction("contrast", readNonNegativeAmount);
export const grayscale = filterFunction("grayscale", readNonNegativeAmount);
export const hueRotate = filterFunction("hueRotate", readAngle);
export const invert = filterFunction("invert", readNonNegativeAmount);
export const sepia = filterFunction("sepia", readNonNegativeAmount);
export const saturate = filterFunction("saturate", readNonNegativeAmount);
export const opacity = filterFunction("opacity", readNonNegativeAmount);

const color = ["color", "color"] as const;
const offsetX = ["offsetX", "number"] as const;
const offsetY = ["offsetY", "number"] as const;
const standardDeviation = ["standardDeviation", "number"] as const;

const handler = shorthandHandler(
  [
    [offsetX, offsetY, standardDeviation, color],
    [color, offsetX, offsetY],
    [color, offsetX, offsetY, standardDeviation],
    [offsetX, offsetY, color],
    [offsetX, offsetY, standardDeviation, color],
  ],
  [],
  "object",
);

export const dropShadow: StyleFunctionResolver = (
  resolveValue,
  func,
  get,
  options,
) => {
  const args = resolveValue(func[2]);
  if (!isStyleDescriptorArray(args)) {
    return undefined;
  }

  const shadow: unknown = handler(resolveValue, args, get, options);
  return shadow === undefined ? undefined : { dropShadow: shadow };
};

/** CSS variables may expand to multiple filters; native filter arrays must be flat. */
export const filter: StyleFunctionResolver = (resolveValue, descriptor) => {
  const value: unknown = resolveValue(descriptor[2]);
  if (Array.isArray(value)) {
    const filters: unknown[] = value.flat(Infinity);
    // A keyword among other filters leaves the list invalid; one a var() substitutes makes it invalid at computed-value time, which resolves to `unset`
    return filters.some(resetsToNone) ? undefined : filters;
  }
  if (value === undefined) return;
  if (resetsToNone(value)) return null;
  return typeof value === "string" ? value : [value];
};
