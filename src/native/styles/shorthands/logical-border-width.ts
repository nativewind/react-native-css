import { ShortHandSymbol } from "../constants";
import type { StyleFunctionResolver } from "../resolve";

function logicalWidth(start: string, end: string): StyleFunctionResolver {
  return (resolve, descriptor) => {
    const resolved = resolve(descriptor[2]);
    const values: unknown[] = Array.isArray(resolved) ? resolved : [resolved];
    if (
      values.length < 1 ||
      values.length > 2 ||
      !values.every(
        (value) =>
          typeof value === "number" && Number.isFinite(value) && value >= 0,
      )
    )
      return;
    return {
      [ShortHandSymbol]: true,
      [start]: values[0],
      [end]: values[1] ?? values[0],
    };
  };
}

export const borderBlockWidth = logicalWidth(
  "borderTopWidth",
  "borderBottomWidth",
);
export const borderInlineWidth = logicalWidth(
  "borderStartWidth",
  "borderEndWidth",
);
