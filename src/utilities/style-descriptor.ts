import type { StyleDescriptor, StyleFunction } from "react-native-css/compiler";

export function isStyleDescriptorArray(
  value: unknown,
): value is StyleDescriptor[] {
  return Array.isArray(value) && !isStyleFunction(value);
}

export function isStyleFunction(value: unknown): value is StyleFunction {
  if (!Array.isArray(value)) return false;
  const marker: unknown = value[0];
  return (
    marker !== null &&
    typeof marker === "object" &&
    !Array.isArray(marker) &&
    Object.keys(marker).length === 0 &&
    typeof value[1] === "string"
  );
}

/** A comma-separated list holds each item as the array of its tokens, and a token is never such an array, so its first item tells. */
export function isCommaList(value: unknown): value is StyleDescriptor[][] {
  return (
    Array.isArray(value) &&
    Array.isArray(value[0]) &&
    !isStyleFunction(value[0])
  );
}

/** A comma-separated list with a lone token in place of its array, the form function arguments and React Native's list props take. */
export function commaListItems(value: StyleDescriptor[]): StyleDescriptor[];
export function commaListItems(value: StyleDescriptor): StyleDescriptor;
export function commaListItems(value: unknown): unknown;
export function commaListItems(value: unknown): unknown {
  return isCommaList(value)
    ? value.map((item) => (item.length === 1 ? item[0] : item))
    : value;
}
