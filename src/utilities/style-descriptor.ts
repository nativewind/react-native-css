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

export function isStyleFunction(
  value: StyleDescriptor,
): value is StyleFunction {
  if (Array.isArray(value)) {
    return typeof value[0] === "object"
      ? Object.keys(value[0]).length === 0
      : false;
  }

  return false;
}
