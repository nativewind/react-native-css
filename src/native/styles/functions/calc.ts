import type { StyleFunctionResolver } from "../resolve";

interface Value {
  value: number;
  isPercent: boolean;
}

const precedence: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

export const calc: StyleFunctionResolver = (resolveValue, func) => {
  const tokens = resolveValue(func[2]);

  if (!Array.isArray(tokens)) {
    return tokens;
  }

  // --- Step 1: Convert to RPN (Shunting-Yard) ---
  const output: (string | Value)[] = [];
  const ops: string[] = [];

  for (const t of tokens) {
    if (typeof t === "number") {
      output.push({ value: round(t), isPercent: false });
    } else if (typeof t === "string") {
      if (t.endsWith("%")) {
        const num = parseFloat(t.slice(0, -1));
        if (Number.isNaN(num)) return undefined;
        output.push({ value: round(num / 100), isPercent: true });
      } else if (t === "+" || t === "-" || t === "*" || t === "/") {
        while (
          ops.length &&
          (ops[ops.length - 1] === "+" ||
            ops[ops.length - 1] === "-" ||
            ops[ops.length - 1] === "*" ||
            ops[ops.length - 1] === "/") &&
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          (precedence[ops[ops.length - 1]!] ?? 0) >= (precedence[t] ?? 0)
        ) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          output.push(ops.pop()!);
        }
        ops.push(t);
      } else if (t === "(") {
        ops.push(t);
      } else if (t === ")") {
        while (ops.length && ops[ops.length - 1] !== "(") {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          output.push(ops.pop()!);
        }
        if (ops.pop() !== "(") return undefined; // mismatched parens
      } else {
        return undefined; // invalid token
      }
    } else {
      return undefined;
    }
  }
  while (ops.length) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const op = ops.pop()!;
    if (op === "(" || op === ")") return undefined;
    output.push(op);
  }

  // --- Step 2: Evaluate RPN ---
  const stack: Value[] = [];
  for (const t of output) {
    if (typeof t !== "string") {
      stack.push(t);
    } else {
      const b = stack.pop();
      const a = stack.pop();
      if (!a || !b) return undefined;

      const res: Value = { value: 0, isPercent: false };

      switch (t) {
        case "+":
        case "-": {
          if (a.isPercent !== b.isPercent) return undefined; // cannot mix
          res.isPercent = a.isPercent;
          res.value =
            t === "+" ? round(a.value + b.value) : round(a.value - b.value);
          break;
        }
        case "*": {
          if (a.isPercent && b.isPercent) return undefined; // ambiguous
          res.isPercent = a.isPercent || b.isPercent;
          res.value = round(a.value * b.value);
          break;
        }
        case "/": {
          if (b.value === 0) return undefined;
          if (a.isPercent && b.isPercent) {
            // % / % → plain number ratio
            res.isPercent = false;
            res.value = round(a.value / b.value);
          } else {
            res.isPercent = a.isPercent || b.isPercent;
            res.value = round(a.value / b.value);
          }
          break;
        }
      }
      stack.push(res);
    }
  }

  if (stack.length !== 1) return undefined;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const final = stack[0]!;
  if (final.isPercent) {
    return `${final.value * 100}%`;
  }
  return final.value;
};

function round(number: number) {
  return Math.round((number + Number.EPSILON) * 10000) / 10000;
}
