import { resetsToNone } from "../resets-to-none";
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
    // A var() holding several transforms substitutes each of them into the list
    const entries: unknown[] = transforms.flat();

    // A keyword among other transforms leaves the list invalid; one a var() substitutes makes it invalid at computed-value time, which resolves to `unset`
    return entries.some(resetsToNone) ? undefined : entries;
  } else if (transforms) {
    // If it's a single transform, wrap it in an array
    return [transforms];
  } else {
    return;
  }
};
