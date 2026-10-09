import type { StyleDescriptor } from "react-native-css/compiler";
import { isStyleDescriptorArray } from "react-native-css/utilities";

import type { SimpleResolveValue, StyleFunctionResolver } from "../resolve";
import { scaleFactor } from "../scale-factor";

// A component left without a valid value makes the declaration invalid at computed-value time (css-variables-1 §3.1), which null carries
export const scale: StyleFunctionResolver = (resolveValue, descriptor) => {
  const operands = resolveOperands(resolveValue, descriptor[2]);
  const x = scaleFactor(operands[0]);
  const y = operands.length > 1 ? scaleFactor(operands[1]) : x;

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
  const operands = resolveOperands(resolveValue, descriptor[2]);
  const x = operands[0];
  const y = operands.length > 1 ? operands[1] : 0;

  if (!isTransformComponent(x) || !isTransformComponent(y)) {
    return null;
  }

  return [{ translateX: x }, { translateY: y }];
};

// A var() can supply the whole operand list, which resolves to an array in place of one operand
function resolveOperands(
  resolveValue: SimpleResolveValue,
  args: StyleDescriptor,
): unknown[] {
  if (isStyleDescriptorArray(args)) {
    return args.map((arg) => resolveValue(arg));
  }

  const value = resolveValue(args);

  return Array.isArray(value) ? value : [value];
}

function isTransformComponent(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}
