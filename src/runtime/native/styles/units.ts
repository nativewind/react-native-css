import { vh as vhObs, vw as vwObs } from "../reactivity";
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

export const vw: StyleFunctionResolver = (_, func, get) => {
  const value = func[2];

  if (typeof value !== "number") {
    return;
  }

  return round(get(vwObs) * (value / 100));
};

export const vh: StyleFunctionResolver = (_, func, get) => {
  const value = func[2];

  if (typeof value !== "number") {
    return;
  }

  return round((value / 100) * get(vhObs));
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
