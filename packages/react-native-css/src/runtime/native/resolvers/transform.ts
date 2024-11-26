import { StyleFunctionResolver } from ".";
import { StyleDescriptor } from "../../runtime.types";
import { transformKeys } from "../utils/properties";
import { ShortHandSymbol } from "./shorthand";

/**
 * Handle the unparsable transform property by converting its values into StyleDeclarations
 * Each value should be a StyleDescriptor function of the transform type
 */
export const transform: StyleFunctionResolver = (
  resolveValue,
  transformDescriptor,
  options,
  effect,
) => {
  const transformArgs = Object.assign([] as StyleDescriptor[], {
    [ShortHandSymbol]: true,
  });

  for (const args of transformDescriptor[2] as any[]) {
    if (args[1] === "translate") {
      transformArgs.push([args[2][0], "translateX"]);
      transformArgs.push([args[2][1], "translateY"]);
    } else if (transformKeys.has(args[1])) {
      transformArgs.push([args[2][0], args[1]]);
    } else {
      const value = resolveValue(args, options, effect);
      if (value) {
        transformArgs.push(value);
      }
    }
  }

  return transformArgs;
};
