import type { StyleFunctionResolver } from "./resolve";

/**
 * A font size computed against the parent's: `resolveValue` evaluates the
 * argument in `parentFontScopeOptions`, so an `em` inside it and a percentage
 * a variable holds both measure against the parent's font size.
 */
export const fontSize: StyleFunctionResolver = (resolve, func) => {
  const size = resolve(func[2]);

  if (typeof size === "number") {
    return size;
  }

  if (typeof size === "string" && size.endsWith("%")) {
    const percentage = Number.parseFloat(size);

    return Number.isFinite(percentage)
      ? resolve([{}, "em", percentage / 100])
      : undefined;
  }

  return;
};
