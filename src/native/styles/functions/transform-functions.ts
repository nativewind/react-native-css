import { isStyleDescriptorArray } from "react-native-css/utilities";

import type { StyleFunctionResolver } from "../resolve";

// CSS `scale` accepts unitless numbers AND percentage strings per CSSWG, but
// React Native's transform validator only accepts unitless numbers. Tailwind v4
// emits `scale: var(--tw-scale-x) var(--tw-scale-y)`, whose vars resolve to
// strings like "100%" / "75%" at runtime — normalize "N%" → N/100 before the
// type guards. (rotate keeps "Ndeg", translate keeps "N%"; only scale is unitless.)
const normalizeScaleArg = (value: unknown): unknown => {
  if (typeof value === "string" && value.endsWith("%")) {
    const fraction = parseFloat(value);
    if (!Number.isNaN(fraction)) {
      return fraction / 100;
    }
  }
  return value;
};

export const scale: StyleFunctionResolver = (resolveValue, descriptor) => {
  const args = descriptor[2];

  if (!isStyleDescriptorArray(args)) {
    return { scale: normalizeScaleArg(resolveValue(args)) };
  }

  const x = normalizeScaleArg(resolveValue(args[0]));
  const y = normalizeScaleArg(resolveValue(args[1]));

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
