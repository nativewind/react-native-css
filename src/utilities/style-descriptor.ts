import type { StyleDescriptor, StyleFunction } from "react-native-css/compiler";

export function isStyleDescriptorArray(
  value: unknown,
): value is StyleDescriptor[] {
  if (Array.isArray(value)) {
    // A style function's head is a plain object, so an object at index 0 means
    // this is a function unless it is a nested GROUP. `typeof null` is also
    // `"object"` and null is neither — it is a value, a hole the compiler left
    // that reaches a native runtime as `null` once the sheet has been through
    // `JSON.stringify`. Excluding it here is what `isStyleFunction` below does
    // for the same reason.
    const head: unknown = value[0];

    return typeof head === "object" && head !== null
      ? Array.isArray(head)
      : true;
  }

  return false;
}

export function isStyleFunction(value: unknown): value is StyleFunction {
  if (Array.isArray(value)) {
    // A style function's head is `Record<never, never>` - a plain object with
    // no keys. A nested stack (`[[], "Arial"]`) and a null entry both reach
    // `typeof "object"` without being one.
    const head: unknown = value[0];

    return typeof head === "object" && head !== null && !Array.isArray(head)
      ? Object.keys(head).length === 0
      : false;
  }

  return false;
}
