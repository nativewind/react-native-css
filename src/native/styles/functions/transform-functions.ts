import { isStyleDescriptorArray } from "react-native-css/utilities";

import type { StyleFunctionResolver } from "../resolve";

export const scale: StyleFunctionResolver = (resolveValue, descriptor) => {
  const args = descriptor[2];

  if (!isStyleDescriptorArray(args)) {
    return { scale: resolveValue(args) };
  }

  const x = resolveValue(args[0]);
  const y = resolveValue(args[1]);

  const isXValid = typeof x === "string" || typeof x === "number";
  const isYValid = typeof y === "string" || typeof y === "number";

  if (isXValid && isYValid) {
    return x === y ? { scale: x } : [{ scaleX: x }, { scaleY: y }];
  } else if (isXValid) {
    return { scaleX: x };
  } else if (isYValid) {
    return { scaleY: y };
  }

  return;
};

export const rotate: StyleFunctionResolver = (resolveValue, descriptor) => {
  const args = descriptor[2];

  if (!isStyleDescriptorArray(args)) {
    return { rotate: resolveValue(args) };
  }

  const x = resolveValue(args[0]);
  const y = resolveValue(args[1]);
  const z = resolveValue(args[2]);

  const isXValid = typeof x === "string" || typeof x === "number";
  const isYValid = typeof y === "string" || typeof y === "number";
  const isZValid = typeof z === "string" || typeof z === "number";

  if (isXValid && isYValid && isZValid) {
    return [{ rotateX: x }, { rotateY: y }, { rotateZ: z }];
  } else if (isXValid && isYValid) {
    return [{ rotateX: x }, { rotateY: y }];
  } else if (isXValid && isZValid) {
    return [{ rotateX: x }, { rotateZ: z }];
  } else if (isYValid && isZValid) {
    return [{ rotateY: y }, { rotateZ: z }];
  } else if (isXValid) {
    return { rotateX: x };
  } else if (isYValid) {
    return { rotateY: y };
  } else if (isZValid) {
    return { rotateZ: z };
  }

  return;
};

export const translate: StyleFunctionResolver = (resolveValue, descriptor) => {
  const args = descriptor[2];

  if (!isStyleDescriptorArray(args)) {
    return;
  }

  const x = resolveValue(args[0]);
  const y = resolveValue(args[1]);

  const isXValid = typeof x === "string" || typeof x === "number";
  const isYValid = typeof y === "string" || typeof y === "number";

  if (isXValid && isYValid) {
    return [{ translateX: x }, { translateY: y }];
  } else if (isXValid) {
    return { translateX: x };
  } else if (isYValid) {
    return { translateY: y };
  }

  return;
};
