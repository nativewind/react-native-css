import type { StyleFunctionResolver } from "../resolve";
import { readShadows, type ShadowGrammar } from "../shorthands/_shadow";

export const blur: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    blur: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const brightness: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    brightness: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const contrast: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    contrast: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const grayscale: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    grayscale: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const hueRotate: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    hueRotate: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const invert: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    invert: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const sepia: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    sepia: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const saturate: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    saturate: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

export const opacity: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  return {
    opacity: (Array.isArray(args) ? args[0] : args) as unknown,
  };
};

const dropShadowGrammar: ShadowGrammar = { maxLengths: 3, acceptsInset: false };

export const dropShadow: StyleFunctionResolver = (resolveValue, func) => {
  const [shadow, ...others] =
    readShadows(resolveValue(func[2]), dropShadowGrammar, resolveValue) ?? [];

  if (shadow === undefined || others.length > 0) {
    return;
  }

  return {
    dropShadow: {
      offsetX: shadow.offsetX,
      offsetY: shadow.offsetY,
      standardDeviation: shadow.blurRadius,
      color: shadow.color,
    },
  };
};

/** CSS variables may expand to multiple filters; native filter arrays must be flat. */
export const filter: StyleFunctionResolver = (resolveValue, descriptor) => {
  const value: unknown = resolveValue(descriptor[2]);
  if (Array.isArray(value)) {
    const filters: unknown[] = value.flat(Infinity);
    return filters.filter(
      (entry) => entry !== undefined && entry !== "initial",
    );
  }
  if (value === undefined || value === "initial") return;
  if (value === "none") return null;
  return typeof value === "string" ? value : [value];
};
