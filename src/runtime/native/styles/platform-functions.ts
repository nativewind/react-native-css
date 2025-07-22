import { PlatformColor } from "react-native";
import type { StyleFunctionResolver } from "./resolve";

export const platformColor: StyleFunctionResolver = (resolveValue, value) => {
  const color: unknown = resolveValue(value[2]);
  if (Array.isArray(color)) {
    return PlatformColor(...(color as string[]));
  } else if (typeof color === "string") {
    return PlatformColor(color);
  }

  return;
};
