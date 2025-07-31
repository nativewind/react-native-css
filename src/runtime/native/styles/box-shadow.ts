import { applyShorthand, isStyleDescriptorArray } from "../../utils";
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
    [offsetX, offsetY, blurRadius, spreadDistance, color],
    [color, offsetX, offsetY],
    [color, offsetX, offsetY, blurRadius],
    [color, offsetX, offsetY, blurRadius, spreadDistance],
    [offsetX, offsetY, color],
    [offsetX, offsetY, blurRadius, color],
  ],
  [],
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
    return args.flatMap((shadows) => {
      if (shadows === undefined) {
        return [];
      } else if (isStyleDescriptorArray(shadows)) {
        if (shadows.length === 0) {
          return [];
        } else {
          return shadows
            .map((shadow) => {
              return applyShorthand(
                handler(resolveValue, shadow, get, options),
              );
            })
            .filter((v) => v !== undefined);
        }
      } else {
        return applyShorthand(handler(resolveValue, shadows, get, options));
      }
    });
  }
};
