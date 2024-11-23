import type { StyleFunctionResolver } from ".";
import { rem, vh, vw } from "../globals";

export const em: StyleFunctionResolver = (_, func, options) => {
  const value = func[2]?.[0];

  if (typeof value !== "number" || !options.getEm) {
    return;
  }

  return value * options.getEm();
};

export const vwResolver: StyleFunctionResolver = (
  _,
  func,
  _options,
  effect,
) => {
  const value = func[2]?.[0];

  if (typeof value !== "number") {
    return;
  }

  return (effect?.get(vw) ?? vw.get()) * (value / 100);
};

export const vhResolver: StyleFunctionResolver = (
  _,
  func,
  _options,
  effect,
) => {
  const value = func[2]?.[0];

  if (typeof value !== "number") {
    return;
  }

  return (value / 100) * (effect?.get(vh) ?? vh.get());
};

export const remResolver: StyleFunctionResolver = (
  _,
  func,
  _options,
  effect,
) => {
  const value = func[2]?.[0];

  if (typeof value !== "number") {
    return;
  }

  return value * (effect?.get(rem) ?? rem.get());
};
