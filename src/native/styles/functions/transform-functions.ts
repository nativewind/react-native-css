import type { StyleDescriptor } from "react-native-css/compiler";
import {
  commaListItems,
  isCommaList,
  isStyleDescriptorArray,
} from "react-native-css/utilities";

import type { SimpleResolveValue, StyleFunctionResolver } from "../resolve";
import { scaleFactor } from "../scale-factor";

export const scale: StyleFunctionResolver = (resolveValue, descriptor) => {
  const values = transformArguments(resolveValue, descriptor[2]);

  if (values.length === 1) {
    return { scale: scaleFactor(values[0]) };
  }

  const x = scaleFactor(values[0]);
  const y = scaleFactor(values[1]);

  const isXValid = typeof x === "string" || typeof x === "number";
  const isYValid = typeof y === "string" || typeof y === "number";

  if (isXValid && isYValid) {
    return x === y ? { scale: x } : [{ scaleX: x }, { scaleY: y }];
  } else if (isXValid) {
    return { scale: x };
  } else if (isYValid) {
    return { scaleY: y };
  }

  return;
};

export const rotate: StyleFunctionResolver = (resolveValue, descriptor) => {
  const values = transformArguments(resolveValue, descriptor[2]);

  if (values.length === 1) {
    return { rotate: values[0] };
  }

  const [x, y, z] = values;

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
  const [x, y] = transformArguments(resolveValue, descriptor[2]);

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

/** The values in their written places, so one that resolves to nothing moves no other, or the items of a comma-separated list a lone value resolves to. */
function transformArguments(
  resolveValue: SimpleResolveValue,
  args: StyleDescriptor,
): unknown[] {
  if (isStyleDescriptorArray(args)) {
    return commaListItems(args).map((value) => resolveValue(value));
  }

  const resolved: unknown = resolveValue(args);
  return isCommaList(resolved) ? commaListItems(resolved) : [resolved];
}
