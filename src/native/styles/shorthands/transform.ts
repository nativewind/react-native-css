import { isCommaList } from "react-native-css/utilities";

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

  // css-transforms-1 §4: a transform list is space-separated, so a comma makes the declaration invalid at computed-value time
  if (isCommaList(transforms)) {
    return null;
  } else if (Array.isArray(transforms)) {
    return transforms.filter(
      (transform) => transform !== undefined && transform !== "initial",
    ) as unknown;
  } else if (transforms) {
    // If it's a single transform, wrap it in an array
    return [transforms];
  } else {
    return;
  }
};
