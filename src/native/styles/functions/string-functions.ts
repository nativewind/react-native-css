import type { StyleFunctionResolver } from "../resolve";

export const join: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);

  if (!Array.isArray(args)) {
    return args;
  }

  const array: unknown = args[0];
  const separator: unknown = args[1] ?? ",";

  if (!Array.isArray(array)) {
    return array;
  }

  if (!separator || typeof separator !== "string") {
    return array.join();
  }

  return array.join(separator);
};
