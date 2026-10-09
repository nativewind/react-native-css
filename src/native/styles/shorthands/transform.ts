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

  // A group from a resolver and the list a var() fallback holds each nest a level, while React Native takes a flat list of single-key objects
  const resolved: unknown[] = [transforms].flat(Number.POSITIVE_INFINITY);
  const entries = resolved.filter(
    (transform) => transform !== undefined && transform !== "initial",
  );

  // Anything but a transform entry, null included, leaves the declaration invalid at computed-value time, so the transform is none (css-variables-1 §3.1)
  return entries.every(isTransformEntry) ? entries : [];
};

function isTransformEntry(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}
