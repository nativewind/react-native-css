import type { StyleDescriptor, StyleFunction } from "react-native-css/compiler";

export function isStyleDescriptorArray(
  value: unknown,
): value is StyleDescriptor[] {
  return Array.isArray(value) && !isStyleFunction(value);
}

/** A timing function list as the compiler writes it: one easing alone, several as the list. */
export function timingFunctionValue<Easings extends readonly unknown[]>(
  easings: Easings,
): Easings | Easings[number] {
  const [only] = easings;
  return easings.length === 1 && only !== undefined ? only : easings;
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
