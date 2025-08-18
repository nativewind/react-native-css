import { PixelRatio, PlatformColor, StyleSheet } from "react-native";

import type { StyleFunctionResolver } from "../resolve";

export const platformColor: StyleFunctionResolver = (resolveValue, value) => {
  const color: unknown = resolveValue(value[2]);
  if (Array.isArray(color)) {
    return PlatformColor(...(color as string[]));
  } else if (typeof color === "string") {
    return PlatformColor(color);
  }

  return;
};

export const hairlineWidth: StyleFunctionResolver = () => {
  return StyleSheet.hairlineWidth;
};

export const pixelRatio: StyleFunctionResolver = () => {
  return PixelRatio.get();
};

export const fontScale: StyleFunctionResolver = () => {
  return PixelRatio.getFontScale();
};

export const getPixelSizeForLayoutSize: StyleFunctionResolver = (
  resolveValue,
  value,
) => {
  const size: unknown = resolveValue(value[2]);
  if (typeof size === "number") {
    return PixelRatio.getPixelSizeForLayoutSize(size);
  }

  return;
};

export const roundToNearestPixel: StyleFunctionResolver = (
  resolveValue,
  value,
) => {
  const size: unknown = resolveValue(value[2]);
  if (typeof size === "number") {
    return PixelRatio.roundToNearestPixel(size);
  }

  return;
};
