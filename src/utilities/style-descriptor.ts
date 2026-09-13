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

export function postProcessStyleFunction(value: StyleDescriptor): [
  // Should it be delayed
  boolean,
  // Does it use variables
  boolean,
] {
  if (!Array.isArray(value)) {
    return [false, false];
  }

  if (isStyleDescriptorArray(value)) {
    let shouldDelay = false;
    let usesVariables = false;
    for (const v of value) {
      const [delayed, variables] = postProcessStyleFunction(v);
      shouldDelay ||= delayed;
      usesVariables ||= variables;
    }

    return [shouldDelay, usesVariables];
  }

  let [shouldDelay, usesVariables] = postProcessStyleFunction(value[2]);

  usesVariables ||= value[1] === "var";
  shouldDelay ||= value[3] === 1 || usesVariables;

  if (shouldDelay) {
    return [true, usesVariables];
  }

  return [false, false];
}
