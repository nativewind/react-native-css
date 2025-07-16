/* eslint-disable */
import { rem as remObs, vh as vhObs, vw as vwObs } from "../reactivity";
import type { StyleFunctionResolver } from "./resolve";

export const em: StyleFunctionResolver = (resolve, func) => {
  let value = func[2]?.[0];

  if (!value) {
    return;
  }

  const emValue = resolve([{}, "var", ["__rn-css-em"]]);
  return round(Number(value) * emValue);
};

export const vw: StyleFunctionResolver = (_, func, get) => {
  const value = func[2]?.[0];

  if (typeof value !== "number") {
    return;
  }

  return round(get(vwObs) * (value / 100));
};

export const vh: StyleFunctionResolver = (_, func, get) => {
  const value = func[2]?.[0];

  if (typeof value !== "number") {
    return;
  }

  return round((value / 100) * get(vhObs));
};

export const rem: StyleFunctionResolver = (_, func, get) => {
  const value = func[2]?.[0];

  if (typeof value !== "number") {
    return;
  }

  return round(value * get(remObs));
};

function round(number: number) {
  return Math.round((number + Number.EPSILON) * 100) / 100;
}
