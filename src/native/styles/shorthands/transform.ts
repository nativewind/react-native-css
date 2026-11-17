import { isStyleDescriptorArray } from "react-native-css/utilities";

import type { StyleFunctionResolver } from "../resolve";

/**
 * Handle the unparsable transform property by converting its values into StyleDeclarations
 * Each value should be a StyleDescriptor function of the transform type
 */
export const transform: StyleFunctionResolver = (
  resolveValue,
  transformDescriptor,
) => {
  const args = transformDescriptor[2];
  const entries: unknown[] = [];

  // Anything but a transform entry, null included, leaves the declaration invalid at computed-value time, so the transform is none (css-variables-1 §3.1)
  if (!isStyleDescriptorArray(args)) {
    return appendEntries(entries, resolveValue(args)) ? entries : [];
  }

  // Each function in turn, rather than resolving the list into an array to copy again
  for (const arg of args) {
    if (!appendEntries(entries, resolveValue(arg))) return [];
  }

  return entries;
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
