import type { StyleFunctionResolver } from "./resolve";

export const lineHeight: StyleFunctionResolver = (resolve, func) => {
  const value = resolve(func[2]);

  if (typeof value !== "number") {
    return;
  }

  let emValue = resolve([{}, "var", ["__rn-css-em"]]);

  if (typeof emValue !== "number") {
    emValue = resolve([{}, "var", ["__rn-css-rem"]]);
  }

  if (typeof emValue !== "number") {
    return;
  }

  return round(value * emValue);
};

function round(number: number) {
  return Math.round((number + Number.EPSILON) * 100) / 100;
}
