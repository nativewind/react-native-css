import type { StyleDescriptor, StyleFunction } from "react-native-css/compiler";

export function isStyleDescriptorArray(
  value: unknown,
): value is StyleDescriptor[] {
  if (Array.isArray(value)) {
    // If its an array and the first item is an object, the only allowed value is an array
    return typeof value[0] === "object" ? Array.isArray(value[0]) : true;
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
