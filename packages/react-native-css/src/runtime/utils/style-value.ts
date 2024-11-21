import { StyleDescriptor } from "../runtime.types";

export function isStyleDescriptorArray(
  value: StyleDescriptor | StyleDescriptor[],
): value is StyleDescriptor[] {
  if (Array.isArray(value)) {
    // If its an array and the first item is an object, the only allowed value is an array
    return typeof value[0] === "object" ? Array.isArray(value[0]) : true;
  }

  return false;
}