import type { StyleFunctionResolver } from "../resolve";

export const max: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);

  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "number")) {
    return;
  }

  return Math.max(...(args as number[]));
};

export const min: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);

  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "number")) {
    return;
  }

  return Math.min(...(args as number[]));
};

export const clamp: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);

  const [clampValue, min, max] = args as number[];

  if (
    !Array.isArray(args) ||
    typeof clampValue !== "number" ||
    typeof min !== "number" ||
    typeof max !== "number"
  ) {
    return;
  }

  return Math.min(Math.max(clampValue, min), max);
};
