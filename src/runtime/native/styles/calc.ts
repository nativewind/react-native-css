/* eslint-disable */
import { isStyleDescriptorArray } from "../../utils";
import type { StyleFunctionResolver } from "./resolve";

const calcPrecedence: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
};

export const calc: StyleFunctionResolver = (resolveValue, func) => {
  let mode: "number" | "percentage" | undefined;
  const values: number[] = [];
  const ops: string[] = [];

  const args = resolveValue(func[2]);

  if (!isStyleDescriptorArray(args)) return;

  for (let token of args) {
    if (typeof token === "number") {
      if (!mode) mode = "number";
      if (mode !== "number") return;
      values.push(token);
      continue;
    } else if (typeof token === "string") {
      if (token === "(") {
        ops.push(token);
      } else if (token === ")") {
        // Resolve all values within the brackets
        while (ops.length && ops[ops.length - 1] !== "(") {
          applyCalcOperator(ops.pop()!, values.pop()!, values.pop()!, values);
        }
        ops.pop();
      } else if (token.endsWith("%")) {
        if (!mode) mode = "percentage";
        if (mode !== "percentage") return;
        values.push(Number.parseFloat(token.slice(0, -1)));
      } else {
        // This means we have an operator
        while (
          ops.length &&
          ops[ops.length - 1] &&
          // @ts-ignore
          calcPrecedence[ops[ops.length - 1]] >= calcPrecedence[token]
        ) {
          applyCalcOperator(ops.pop()!, values.pop()!, values.pop()!, values);
        }
        ops.push(token);
      }
    } else {
      // We got something unexpected
      return;
    }
  }
  // case "object": {
  //   // All values should resolve to a numerical value
  //   const value = resolveValue(token);
  //   switch (typeof value) {
  //     case "number": {
  //       if (!mode) mode = "number";
  //       if (mode !== "number") return;
  //       values.push(value);
  //       continue;
  //     }
  //     case "string": {
  //       if (!value.endsWith("%")) {
  //         return;
  //       }
  //       if (!mode) mode = "percentage";
  //       if (mode !== "percentage") return;
  //       values.push(Number.parseFloat(value.slice(0, -1)));
  //       continue;
  //     }
  //     default:
  //       return;
  //   }
  // }
  while (ops.length) {
    applyCalcOperator(ops.pop()!, values.pop()!, values.pop()!, values);
  }

  if (!mode) return;

  const num = values[0];

  if (typeof num !== "number") {
    return;
  }

  const value = Math.round((num + Number.EPSILON) * 100) / 100;

  if (mode === "percentage") {
    return `${value}%`;
  }

  return value;
};

function applyCalcOperator(
  operator: string,
  b: number, // These are reversed because we pop them off the stack
  a: number,
  values: number[],
) {
  switch (operator) {
    case "+":
      return values.push(a + b);
    case "-":
      return values.push(a - b);
    case "*":
      return values.push(a * b);
    case "/":
      return values.push(a / b);
  }

  return;
}
