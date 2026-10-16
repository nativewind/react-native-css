import type { StyleFunctionResolver } from "../resolve";
import { readShadows, type Shadow, type ShadowGrammar } from "./_shadow";

const boxShadowGrammar: ShadowGrammar = { maxLengths: 4, acceptsInset: true };

export const boxShadow: StyleFunctionResolver = (resolveValue, func) => {
  const value: unknown = resolveValue(func[2]);

  // React Native reads a string itself, `none` included.
  if (value === undefined || value === null || typeof value === "string") {
    return value;
  }

  const shadows = readShadows(value, boxShadowGrammar, resolveValue);

  if (shadows === undefined) {
    return;
  }

  return shadows.filter((shadow) => !isTransparent(shadow)).map(toBoxShadow);
};

/** Tailwind's unset shadow layers hold `0 0 #0000`, which React Native would still draw as a native shadow. */
function isTransparent({ color }: Shadow): boolean {
  return color === "#0000" || color === "transparent";
}

function toBoxShadow({ inset, ...shadow }: Shadow) {
  return inset ? { ...shadow, inset } : shadow;
}
