import type { StyleDescriptor } from "../../../../compiler";
import { isStyleDescriptorArray } from "../../../utils";
import type { StyleFunctionResolver } from "../resolve";
import { shorthandHandler } from "./_handler";

const color = ["color", "string"] as const;
const offsetX = ["offsetX", "number"] as const;
const offsetY = ["offsetY", "number"] as const;
const blurRadius = ["blurRadius", "number"] as const;
const spreadDistance = ["spreadDistance", "number"] as const;
// const inset = ["inset", "string"] as const;

function deepFlattenToArrayOfStyleDescriptors(
  arr: StyleDescriptor[],
): StyleDescriptor[] {
  const result: StyleDescriptor[] = [];
  const stack = [arr];
  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      if (current.length > 0 && Array.isArray(current[0])) {
        for (let i = current.length - 1; i >= 0; i--) {
          const elem = current[i];
          if (isStyleDescriptorArray(elem)) stack.push(elem);
        }
      } else {
        result.push(current);
      }
    }
  }
  return result;
}

const handler = shorthandHandler(
  [
    [offsetX, offsetY, blurRadius, spreadDistance, color],
    [color, offsetX, offsetY],
    [color, offsetX, offsetY, blurRadius],
    [color, offsetX, offsetY, blurRadius, spreadDistance],
    [offsetX, offsetY, color],
    [offsetX, offsetY, blurRadius, color],
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
  } else {
    return deepFlattenToArrayOfStyleDescriptors(args)
      .map((shadows) => {
        if (shadows === undefined) {
          return [];
        } else {
          return omitTransparentShadows(
            handler(resolveValue, shadows, get, options),
          );
        }
      })
      .filter((v) => v !== undefined);
  }
};

function omitTransparentShadows(style: unknown) {
  if (typeof style === "object" && style && "color" in style) {
    if (style.color === "#0000" || style.color === "transparent") {
      return;
    }
  }

  return style;
}
