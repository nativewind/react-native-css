import { isStyleDescriptorArray } from "../../../utils";
import type { StyleFunctionResolver } from "../resolve";
import { shorthandHandler } from "./_handler";

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
    return args
      .flatMap((shadows) => {
        if (shadows === undefined) {
          return [];
        } else if (isStyleDescriptorArray(shadows)) {
          if (shadows.length === 0) {
            return [];
          } else if (Array.isArray(shadows[0])) {
            return shadows
              .map((shadow) => {
                return omitTransparentShadows(
                  handler(resolveValue, shadow, get, options),
                );
              })
              .filter((v) => v !== undefined);
          } else {
            return omitTransparentShadows(
              handler(resolveValue, shadows, get, options),
            );
          }
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
