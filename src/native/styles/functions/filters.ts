import { isStyleDescriptorArray } from "react-native-css/utilities";

import type { StyleFunctionResolver } from "../resolve";
import { shorthandHandler } from "../shorthands/_handler";

export const blur: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    blur: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const brightness: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    brightness: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const contrast: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    contrast: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const grayscale: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    grayscale: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const hueRotate: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    hueRotate: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const invert: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    invert: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const sepia: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    sepia: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const saturate: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    saturate: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const opacity: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    hueRotate: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

const color = ["color", "string"] as const;
const offsetX = ["offsetX", "number"] as const;
const offsetY = ["offsetY", "number"] as const;
const blurRadius = ["blurRadius", "number"] as const;

const handler = shorthandHandler(
  [
    [offsetX, offsetY, blurRadius, color],
    [color, offsetX, offsetY],
    [color, offsetX, offsetY, blurRadius],
    [offsetX, offsetY, color],
    [offsetX, offsetY, blurRadius, color],
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

  return isStyleDescriptorArray(args)
    ? {
        dropShadow: handler(resolveValue, args, get, options),
      }
    : undefined;
};
