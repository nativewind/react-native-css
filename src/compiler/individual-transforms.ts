import type {
  Declaration,
  NumberOrPercentage,
  Rotate,
  Scale,
  TokenOrValue,
  Translate,
} from "lightningcss";

import { lengthLeafTokens } from "./calculation";
import {
  identifierToken,
  numberToken,
  percentageToken,
  spaceSeparated,
} from "./tokens";

/**
 * Carries `translate`, `rotate` and `scale` across the first pass as the tokens
 * they were written as. lightningcss before
 * https://github.com/parcel-bundler/lightningcss/pull/1340 folds a parsed one
 * into `transform` when it serialises the rule, and passes an unparsed one
 * through in place.
 */
export function unparseIndividualTransform(
  declaration: Declaration,
): Declaration | undefined {
  switch (declaration.property) {
    case "translate":
      return {
        property: "unparsed",
        value: {
          propertyId: { property: "translate" },
          value: translateTokens(declaration.value),
        },
      };
    case "rotate":
      return {
        property: "unparsed",
        value: {
          propertyId: { property: "rotate" },
          value: rotateTokens(declaration.value),
        },
      };
    case "scale":
      return {
        property: "unparsed",
        value: {
          propertyId: { property: "scale" },
          value: scaleTokens(declaration.value),
        },
      };
    default:
      return undefined;
  }
}

function numberOrPercentageTokens(value: NumberOrPercentage): TokenOrValue[] {
  switch (value.type) {
    case "number":
      return [numberToken(value.value)];
    case "percentage":
      return [percentageToken(value.value)];
  }
}

function translateTokens(value: Translate): TokenOrValue[] {
  return value === "none"
    ? [identifierToken("none")]
    : spaceSeparated([
        lengthLeafTokens(value.x),
        lengthLeafTokens(value.y),
        lengthLeafTokens(value.z),
      ]);
}

function rotateTokens(value: Rotate): TokenOrValue[] {
  return spaceSeparated([
    [numberToken(value.x)],
    [numberToken(value.y)],
    [numberToken(value.z)],
    [{ type: "angle", value: value.angle }],
  ]);
}

function scaleTokens(value: Scale): TokenOrValue[] {
  return value === "none"
    ? [identifierToken("none")]
    : spaceSeparated([
        numberOrPercentageTokens(value.x),
        numberOrPercentageTokens(value.y),
        numberOrPercentageTokens(value.z),
      ]);
}
