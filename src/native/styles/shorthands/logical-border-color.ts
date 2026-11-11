import { ShortHandSymbol } from "../constants";
import type { StyleFunctionResolver } from "../resolve";

function isColor(value: unknown): boolean {
  return (
    typeof value === "string" ||
    (typeof value === "object" && value !== null && !Array.isArray(value))
  );
}

function logicalColor(start: string, end: string): StyleFunctionResolver {
  return (resolve, descriptor) => {
    const resolved = resolve(descriptor[2]);
    const values: unknown[] = Array.isArray(resolved) ? resolved : [resolved];
    if (values.length < 1 || values.length > 2 || !values.every(isColor)) {
      return;
    }
    return {
      [ShortHandSymbol]: true,
      [start]: values[0],
      [end]: values[1] ?? values[0],
    };
  };
}

// One key set per property, as the compiler writes for the same declaration
export const borderBlockColor = logicalColor(
  "borderTopColor",
  "borderBottomColor",
);
export const borderInlineColor = logicalColor(
  "borderStartColor",
  "borderEndColor",
);
