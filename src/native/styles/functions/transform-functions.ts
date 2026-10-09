import type { StyleDescriptor } from "react-native-css/compiler";
import { isStyleDescriptorArray } from "react-native-css/utilities";

import type { SimpleResolveValue, StyleFunctionResolver } from "../resolve";
import { scaleFactor } from "../scale-factor";

// A component left without a valid value makes the declaration invalid at computed-value time (css-variables-1 §3.1), which null carries
export const scale: StyleFunctionResolver = (resolveValue, descriptor) => {
  const [first, second] = operands(descriptor[2]);
  const x = scaleFactor(argument(resolveValue, first));
  const y = second === undefined ? x : scaleFactor(argument(resolveValue, second));

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

  const x = argument(resolveValue, args[0]);
  const y = argument(resolveValue, args[1]);
  const z = argument(resolveValue, args[2]);

  const isXValid = isTransformComponent(x);
  const isYValid = isTransformComponent(y);
  const isZValid = isTransformComponent(z);

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

  return null;
};

// `translate(x)` is `translate(x, 0)` (css-transforms-1 §9)
export const translate: StyleFunctionResolver = (resolveValue, descriptor) => {
  const [first, second] = operands(descriptor[2]);
  const x = argument(resolveValue, first);
  const y = second === undefined ? 0 : argument(resolveValue, second);

  if (!isTransformComponent(x) || !isTransformComponent(y)) {
    return null;
  }

  return [{ translateX: x }, { translateY: y }];
};

/** A comma-separated argument list holds each argument as the array of its tokens */
function argument(resolveValue: SimpleResolveValue, arg: StyleDescriptor) {
  // A descriptor, never a resolved value: a style function starts with its {}
  // marker, so an array of one entry that isn't a plain object is an item.
  // This skips isStyleFunction's Object.keys, which resolveValue runs anyway
  const token = Array.isArray(arg) && arg.length === 1 ? arg[0] : undefined;
  return resolveValue(
    token !== undefined && (typeof token !== "object" || Array.isArray(token))
      ? token
      : arg,
  );
}

function operands(args: StyleDescriptor): StyleDescriptor[] {
  return isStyleDescriptorArray(args) ? args : [args];
}

function isTransformComponent(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}
