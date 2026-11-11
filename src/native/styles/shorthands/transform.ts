import type { StyleFunctionResolver } from "../resolve";

/**
 * Handle the unparsable transform property by converting its values into StyleDeclarations
 * Each value should be a StyleDescriptor function of the transform type
 */
export const transform: StyleFunctionResolver = (
  resolveValue,
  transformDescriptor,
) => {
  const entries: unknown[] = [];

  // Anything but a transform entry, null included, leaves the declaration invalid at computed-value time, so the transform is none (css-variables-1 §3.1)
  return appendEntries(entries, resolveValue(transformDescriptor[2]))
    ? entries
    : [];
};

// A group from a resolver and the list a var() fallback holds each nest a level, while React Native takes a flat list of single-key objects. Returns false for anything but an entry
function appendEntries(entries: unknown[], value: unknown): boolean {
  if (Array.isArray(value)) {
    for (const item of value as unknown[]) {
      if (!appendEntries(entries, item)) return false;
    }
    return true;
  }

  if (value === undefined || value === "initial") {
    return true;
  }

  if (typeof value === "object" && value !== null) {
    entries.push(value);
    return true;
  }

  return false;
}
