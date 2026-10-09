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
    // React Native takes one property per transform object, so a resolver's group of entries is spread into the list
    const entries: unknown[] = transforms.flat();

    // A function left without a valid argument makes the declaration invalid at computed-value time, so the transform is none (css-variables-1 §3.1)
    return entries.includes(null)
      ? []
      : entries.filter(
          (transform) => transform !== undefined && transform !== "initial",
        );
  } else if (transforms) {
    // If it's a single transform, wrap it in an array
    return [transforms];
  } else {
    return;
  }
};
