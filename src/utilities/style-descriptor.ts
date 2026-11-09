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

/**
 * Whether a resolved value is a comma-separated list: an array of items, each
 * the array of its tokens. A resolved value holds no style functions, so an
 * array led by an array is one. For a descriptor, which can be led by a
 * function, test its first entry with isStyleDescriptorArray instead.
 */
export function isCommaList(value: unknown): value is unknown[][] {
  return Array.isArray(value) && Array.isArray(value[0]);
}

/**
 * A resolved comma-separated list with each one-token item unwrapped, the
 * form function arguments and React Native's list props take. Anything else
 * is returned as it is.
 */
export function commaListItems(value: unknown): unknown {
  return isCommaList(value)
    ? value.map((item) => (item.length === 1 ? item[0] : item))
    : value;
}
