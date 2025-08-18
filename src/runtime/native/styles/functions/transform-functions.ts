import type { StyleFunctionResolver } from "../resolve";

export const scale: StyleFunctionResolver = (resolveValue, descriptor) => {
  const values = resolveValue(descriptor[2]);

  if (Array.isArray(values)) {
    const [x, y] = values as [string | number][];

    if (values.length === 2 && x === y) {
      return { scale: x };
    } else if (values.length === 2) {
      return [{ scaleX: x }, { scaleY: y }];
    } else {
      return { scale: x };
    }
  } else {
    return { scale: values };
  }
};

export const rotate: StyleFunctionResolver = (resolveValue, descriptor) => {
  const values = resolveValue(descriptor[2]);

  if (Array.isArray(values)) {
    const [x, y, z] = values as [string | number][];

    if (values.length === 3 && x === y && x === z) {
      return { rotate: values };
    } else if (values.length === 3) {
      return [{ rotateX: x }, { rotateY: y }, { rotateZ: z }];
    } else if (values.length === 2) {
      return [{ rotateX: x }, { rotateY: y }];
    } else {
      return { rotate: values };
    }
  } else {
    return { rotate: values };
  }
};

export const translate: StyleFunctionResolver = (resolveValue, descriptor) => {
  const values = resolveValue(descriptor[2]);

  if (Array.isArray(values)) {
    const [x, y] = values as [string | number][];

    return [{ translateX: x }, { translateY: y }];
  } else {
    return { translateX: values };
  }
};
