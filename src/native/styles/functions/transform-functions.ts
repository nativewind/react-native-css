import type { StyleDescriptor } from "react-native-css/compiler";
import { isStyleDescriptorArray } from "react-native-css/utilities";

import type { StyleFunctionResolver } from "../resolve";
import { scaleFactor } from "../scale-factor";

// A component left without a valid value makes the declaration invalid at computed-value time (css-variables-1 §3.1), which null carries
export const scale: StyleFunctionResolver = (resolveValue, descriptor) => {
  const [first, second] = operands(descriptor[2]);
  const x = scaleFactor(resolveValue(first));
  const y = second === undefined ? x : scaleFactor(resolveValue(second));

  if (x === null || y === null) {
    return null;
  }

  return x === y ? { scale: x } : [{ scaleX: x }, { scaleY: y }];
};

export const rotate: StyleFunctionResolver = (resolveValue, descriptor) => {
  const args = descriptor[2];

  if (!isStyleDescriptorArray(args)) {
    const angle = resolveValue(args);

    return isTransformComponent(angle) ? { rotate: angle } : null;
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

// `translate(x)` is `translate(x, 0)` (css-transforms-1 §9)
export const translate: StyleFunctionResolver = (resolveValue, descriptor) => {
  const [first, second] = operands(descriptor[2]);
  const x = resolveValue(first);
  const y = second === undefined ? 0 : resolveValue(second);

  if (!isTransformComponent(x) || !isTransformComponent(y)) {
    return null;
  }

  return [{ translateX: x }, { translateY: y }];
};

function operands(args: StyleDescriptor): StyleDescriptor[] {
  return isStyleDescriptorArray(args) ? args : [args];
}

function isTransformComponent(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}
