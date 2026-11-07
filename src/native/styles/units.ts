import { vh as vhObs, vw as vwObs, type Getter } from "../reactivity";
import type { StyleFunctionResolver } from "./resolve";

export const em: StyleFunctionResolver = (resolve, func) => {
  const value = func[2];

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

// A viewport length is a percentage of the window's width or height (css-values-4 §6.1.2)
export function viewportLength(
  unit: "vw" | "vh",
  percentage: number,
  get: Getter,
): number {
  return (percentage / 100) * get(unit === "vw" ? vwObs : vhObs);
}

export const vw: StyleFunctionResolver = (_, func, get) => {
  const value = func[2];

  if (typeof value !== "number") {
    return;
  }

  return round(viewportLength("vw", value, get));
};

export const vh: StyleFunctionResolver = (_, func, get) => {
  const value = func[2];

  if (typeof value !== "number") {
    return;
  }

  return round(viewportLength("vh", value, get));
};

export const rem: StyleFunctionResolver = (resolve, func) => {
  const value = func[2];

  if (typeof value !== "number") {
    return;
  }

  const remValue = resolve([{}, "var", ["__rn-css-rem"]]);

  if (typeof remValue === "number") {
    return round(value * remValue);
  }

  return;
};

function round(number: number) {
  return Math.round((number + Number.EPSILON) * 100) / 100;
}
