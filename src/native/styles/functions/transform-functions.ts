import type { StyleDescriptor } from "react-native-css/compiler";
import {
  commaListItems,
  isStyleDescriptorArray,
} from "react-native-css/utilities";

import type { SimpleResolveValue, StyleFunctionResolver } from "../resolve";
import { scaleFactor } from "../scale-factor";

// A component left without a valid value makes the declaration invalid at computed-value time (css-variables-1 §3.1), which null carries
export const scale: StyleFunctionResolver = (resolveValue, descriptor) => {
  const operands = resolveOperands(resolveValue, descriptor[2]);

  return scalePair(operands, operands.length);
};

export const rotate: StyleFunctionResolver = (resolveValue, descriptor) => {
  const operands = resolveOperands(resolveValue, descriptor[2]);
  const angle = operands[0];

  return operands.length === 1 && isTransformComponent(angle)
    ? { rotate: angle }
    : null;
};

export const translate: StyleFunctionResolver = (resolveValue, descriptor) => {
  const operands = resolveOperands(resolveValue, descriptor[2]);

  return translatePair(operands, operands.length);
};

// css-transforms-2 §3: `translate: none | <length-percentage> [<length-percentage> <length>?]?`, and React Native has no z axis to move along
export const individualTranslate: StyleFunctionResolver = (
  resolveValue,
  descriptor,
) => {
  const operands = resolveOperands(resolveValue, descriptor[2]);
  const z = operands.length > 2 ? operands[2] : 0;

  return operands.length <= 3 && typeof z === "number"
    ? translatePair(operands, Math.min(operands.length, 2))
    : null;
};

// css-transforms-2 §3: `scale: none | [<number> | <percentage>]{1,3}`, and React Native has no z axis to scale along
export const individualScale: StyleFunctionResolver = (
  resolveValue,
  descriptor,
) => {
  const operands = resolveOperands(resolveValue, descriptor[2]);
  const z = operands.length > 2 ? operands[2] : 1;

  return operands.length <= 3 && scaleFactor(z) !== null
    ? scalePair(operands, Math.min(operands.length, 2))
    : null;
};

// The first `count` operands, so a caller can leave out a z without copying the list
function scalePair(operands: readonly unknown[], count: number): unknown {
  const x = scaleFactor(operands[0]);
  const y = count > 1 ? scaleFactor(operands[1]) : x;

  if (count > 2 || x === null || y === null) {
    return null;
  }

  return [{ scaleX: x }, { scaleY: y }];
}

// `translate(x)` is `translate(x, 0)` (css-transforms-1 §9)
function translatePair(operands: readonly unknown[], count: number): unknown {
  const x = operands[0];
  const y = count > 1 ? operands[1] : 0;

  if (count > 2 || !isTransformComponent(x) || !isTransformComponent(y)) {
    return null;
  }

  return [{ translateX: x }, { translateY: y }];
}

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

// A var() substitutes its tokens before the grammar reads them, so it can supply one operand, several, or the whole list (css-variables-1 §3)
function resolveOperands(
  resolveValue: SimpleResolveValue,
  args: StyleDescriptor,
): unknown[] {
  const operands: unknown[] = [];

  if (isStyleDescriptorArray(args)) {
    for (const arg of args) {
      pushOperand(operands, argument(resolveValue, arg));
    }
  } else {
    // A lone var()'s comma-separated list supplies its items as the operands
    pushOperand(operands, commaListItems(resolveValue(args)));
  }

  return operands;
}

function pushOperand(operands: unknown[], operand: unknown) {
  if (Array.isArray(operand)) {
    for (const item of operand as unknown[]) operands.push(item);
  } else {
    operands.push(operand);
  }
}

// A number, or a dimension such as "45deg" or "-50%". A keyword such as none
// from a var() is not one: React Native throws on it, and the property is none
function isTransformComponent(value: unknown): value is string | number {
  if (typeof value === "number") return true;
  if (typeof value !== "string") return false;

  const first = value.charCodeAt(0);
  return (
    (first >= 48 && first <= 57) || first === 45 || first === 43 || first === 46
  );
}
