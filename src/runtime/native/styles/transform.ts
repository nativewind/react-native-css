/* eslint-disable */
import type { StyleFunctionResolver } from "./resolve";

/**
 * Handle the unparsable transform property by converting its values into StyleDeclarations
 * Each value should be a StyleDescriptor function of the transform type
 */
export const transform: StyleFunctionResolver = (
  resolveValue,
  transformDescriptor,
) => {
  return (transformDescriptor[2] as any[])
    .map((args) => resolveValue(args))
    .filter(Boolean);
};
