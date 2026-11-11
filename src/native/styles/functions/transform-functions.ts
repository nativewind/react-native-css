import type { StyleDescriptor } from "react-native-css/compiler";
import {
  commaListItems,
  isStyleDescriptorArray,
  negateAngle,
  rotationAxis,
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

  if (operands.length === 1 && isNoneKeyword(operands[0])) {
    return [{ translateX: 0 }, { translateY: 0 }];
  }

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

  if (operands.length === 1 && isNoneKeyword(operands[0])) {
    return [{ scaleX: 1 }, { scaleY: 1 }];
  }

  const z = operands.length > 2 ? operands[2] : 1;

  return operands.length <= 3 && scaleFactor(z) !== null
    ? scalePair(operands, Math.min(operands.length, 2))
    : null;
};

// css-transforms-2 §3: `rotate: none | <angle> | [x | y | z | <number>{3}] && <angle>`
export const individualRotate: StyleFunctionResolver = (
  resolveValue,
  descriptor,
) => {
  const operands = resolveOperands(resolveValue, descriptor[2]);

  if (operands.length === 1) {
    const angle = operands[0];

    if (isNoneKeyword(angle)) {
      return { rotateZ: "0deg" };
    }

    return isTransformComponent(angle) ? { rotateZ: angle } : null;
  }

  const axisIndex = operands.findIndex(isAxisKeyword);

  if (axisIndex !== -1) {
    const axis = operands[axisIndex];
    const angle = operands[axisIndex === 0 ? 1 : 0];

    return operands.length === 2 &&
      isAxisKeyword(axis) &&
      isTransformComponent(angle)
      ? { [AXIS_ROTATIONS[axis]]: angle }
      : null;
  }

  const angleIndex = operands.length === 4 ? angleOperandIndex(operands) : -1;
  const angle = operands[angleIndex];
  const [x, y, z] = operands.filter((_, index) => index !== angleIndex);

  if (
    angleIndex === -1 ||
    !isTransformComponent(angle) ||
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof z !== "number"
  ) {
    return null;
  }

  const rotation = rotationAxis(x, y, z);

  switch (rotation.type) {
    case "none":
      return { rotateZ: "0deg" };
    case "axis":
      return {
        [rotation.rotation]: rotation.reversed ? negateAngle(angle) : angle,
      };
    case "oblique":
      return null;
    default:
      rotation satisfies never;
      return null;
  }
};

const AXIS_ROTATIONS = {
  x: "rotateX",
  y: "rotateY",
  z: "rotateZ",
} as const;

function isAxisKeyword(value: unknown): value is keyof typeof AXIS_ROTATIONS {
  return value === "x" || value === "y" || value === "z";
}

// The angle of a vector rotation comes first or last, around three numbers
function angleOperandIndex(operands: readonly unknown[]): number {
  const index = operands.findIndex((operand) => typeof operand === "string");

  return index === 0 || index === operands.length - 1 ? index : -1;
}

// `none` is the identity transform, and React Native refuses the keyword itself
function isNoneKeyword(value: unknown): boolean {
  return typeof value === "string" && value.toLowerCase() === "none";
}

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

function isTransformComponent(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}
