import type { StyleFunctionResolver } from "../resolve";

/**
 * Handle the unparsable transform property by converting its values into StyleDeclarations
 * Each value should be a StyleDescriptor function of the transform type
 */
export const transform: StyleFunctionResolver = (
  resolveValue,
  transformDescriptor,
) => {
  const transforms = resolveValue(transformDescriptor[2]);

  if (Array.isArray(transforms)) {
    // A resolver returns either one component or a group of them, so the array
    // arrives one level deep in places. React Native requires exactly one
    // property per entry and enforces it by crashing the screen:
    //
    //   You must specify exactly one property per transform object
    //
    // Flattening is what makes a group ({ scaleX }, { scaleY } from a
    // two-operand `scale()`) a pair of entries rather than a single nested one,
    // and what drops the empty group an unsupported transform leaves behind.
    return transforms
      .flat()
      .filter(
        (transform) => transform !== undefined && transform !== "initial",
      ) as unknown;
  } else if (transforms) {
    // If it's a single transform, wrap it in an array
    return [transforms];
  } else {
    return;
  }
};
