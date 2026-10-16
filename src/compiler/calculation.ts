import type {
  DimensionPercentageFor_LengthValue,
  Length,
  RoundingStrategy,
  TokenOrValue,
} from "lightningcss";

import {
  commaSeparated,
  delimiterToken,
  functionToken,
  identifierToken,
  lengthToken,
  numberToken,
  percentageToken,
  WHITESPACE_TOKEN,
} from "./tokens";

export type LengthLeaf = Length | DimensionPercentageFor_LengthValue;

/** lightningcss's calculation tree for a length, as it holds one it could not fold. */
export type LengthCalculation =
  | { readonly type: "value"; readonly value: LengthLeaf }
  | { readonly type: "number"; readonly value: number }
  | {
      readonly type: "sum";
      readonly value: readonly [LengthCalculation, LengthCalculation];
    }
  | {
      readonly type: "product";
      readonly value: readonly [number, LengthCalculation];
    }
  | { readonly type: "function"; readonly value: LengthMathFunction };

export type LengthMathFunction =
  | {
      readonly type: "calc" | "abs" | "sign";
      readonly value: LengthCalculation;
    }
  | {
      readonly type: "min" | "max" | "hypot";
      readonly value: readonly LengthCalculation[];
    }
  | {
      readonly type: "clamp";
      readonly value: readonly [
        LengthCalculation,
        LengthCalculation,
        LengthCalculation,
      ];
    }
  | {
      readonly type: "round";
      readonly value: readonly [
        RoundingStrategy,
        LengthCalculation,
        LengthCalculation,
      ];
    }
  | {
      readonly type: "rem" | "mod";
      readonly value: readonly [LengthCalculation, LengthCalculation];
    };

export function lengthLeafTokens(leaf: LengthLeaf): TokenOrValue[] {
  switch (leaf.type) {
    case "value":
    case "dimension":
      return [lengthToken(leaf.value)];
    case "percentage":
      return [percentageToken(leaf.value)];
    case "calc":
      return [calculationToken(leaf.value)];
  }
}

/** The one token a calculation is written as: its own math function, or `calc()` around anything else. */
export function calculationToken(calculation: LengthCalculation): TokenOrValue {
  return calculation.type === "function"
    ? mathFunctionToken(calculation.value)
    : functionToken("calc", calculationTokens(calculation));
}

function calculationTokens(calculation: LengthCalculation): TokenOrValue[] {
  switch (calculation.type) {
    case "value":
      return lengthLeafTokens(calculation.value);
    case "number":
      return [numberToken(calculation.value)];
    case "sum":
      return [
        ...calculationTokens(calculation.value[0]),
        WHITESPACE_TOKEN,
        delimiterToken("+"),
        WHITESPACE_TOKEN,
        ...calculationTokens(calculation.value[1]),
      ];
    case "product": {
      const [factor, operand] = calculation.value;

      return [
        numberToken(factor),
        WHITESPACE_TOKEN,
        delimiterToken("*"),
        WHITESPACE_TOKEN,
        ...(operand.type === "sum"
          ? [calculationToken(operand)]
          : calculationTokens(operand)),
      ];
    }
    case "function":
      return [mathFunctionToken(calculation.value)];
  }
}

function mathFunctionToken(math: LengthMathFunction): TokenOrValue {
  switch (math.type) {
    case "calc":
    case "abs":
    case "sign":
      return functionToken(math.type, calculationTokens(math.value));
    case "min":
    case "max":
    case "hypot":
    case "clamp":
    case "rem":
    case "mod":
      return functionToken(
        math.type,
        commaSeparated(math.value.map(calculationTokens)),
      );
    case "round": {
      const [strategy, value, interval] = math.value;

      return functionToken(
        "round",
        commaSeparated([
          [identifierToken(strategy)],
          calculationTokens(value),
          calculationTokens(interval),
        ]),
      );
    }
  }
}
