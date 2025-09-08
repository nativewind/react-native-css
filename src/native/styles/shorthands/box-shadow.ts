import type { StyleDescriptor } from "react-native-css/compiler";
import { isStyleDescriptorArray } from "react-native-css/utilities";

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
    [offsetX, offsetY, blurRadius, spreadDistance],
    [offsetX, offsetY, blurRadius, spreadDistance, color],
    [color, offsetX, offsetY],
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
      .flatMap(flattenShadowDescriptor)
      .map((shadows) => {
        if (shadows === undefined) {
          return;
        } else {
          return omitTransparentShadows(
            handler(resolveValue, shadows, get, options),
          );
        }
      })
      .filter((v) => v !== undefined);
  }
};

function flattenShadowDescriptor(arg: StyleDescriptor): StyleDescriptor[] {
  if (isStyleDescriptorArray(arg) && isStyleDescriptorArray(arg[0])) {
    return arg.map((arg) => {
      return flattenShadowDescriptor(arg);
    });
  }

  return [arg];
}

function omitTransparentShadows(style: unknown) {
  if (typeof style === "object" && style && "color" in style) {
    if (style.color === "#0000" || style.color === "transparent") {
      return;
    }
  }

  return style;
}
