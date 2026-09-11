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

  if (!Array.isArray(args)) return;

  const [minimum, preferred, maximum] = args as unknown[];

  if (
    typeof minimum !== "number" ||
    typeof preferred !== "number" ||
    typeof maximum !== "number"
  ) {
    return;
  }

  return Math.max(minimum, Math.min(preferred, maximum));
};
