import { applyValue } from "../../utils";
import type { StyleFunctionResolver } from "./resolve";
import { shorthandHandler } from "./shorthand";

const color = ["color", "string"] as const;
const offsetX = ["offsetX", "number"] as const;
const offsetY = ["offsetY", "number"] as const;
const blurRadius = ["blurRadius", "number"] as const;
const spreadDistance = ["spreadDistance", "number"] as const;
// const inset = ["inset", "string"] as const;

const handler = shorthandHandler(
  [
    [color, offsetX, offsetY],
    [color, offsetX, offsetY, blurRadius],
    [color, offsetX, offsetY, blurRadius, spreadDistance],
    [offsetX, offsetY, color],
    [offsetX, offsetY, blurRadius, color],
    [offsetX, offsetY, blurRadius, spreadDistance, color],
  ],
  [],
);

export const boxShadow: StyleFunctionResolver = (
  resolveValue,
  func,
  get,
  options,
) => {
  return func[2]?.flatMap((maybeShadow): unknown[] => {
    const resolvedShadow = resolveValue(maybeShadow) as unknown;

    if (!Array.isArray(resolvedShadow)) {
      return [];
    }

    return resolvedShadow.flat().flatMap((shadow): unknown => {
      const result: unknown = handler(
        resolveValue,
        [{}, "@boxShadowHandler", shadow],
        get,
        options,
      );

      if (result === undefined) {
        return [];
      }

      const target = {};
      applyValue(target, "", result);
      return target;
    });
  });
};
