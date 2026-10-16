import { ShortHandSymbol } from "../constants";
import type { StyleFunctionResolver } from "../resolve";
import { readShadows, type Shadow, type ShadowGrammar } from "./_shadow";

const textShadowGrammar: ShadowGrammar = { maxLengths: 4, acceptsInset: false };

/** React Native has no `none`: a transparent shadow with no offset or blur draws nothing, and outranks one a parent Text passes down. */
const noTextShadow: Shadow = {
  offsetX: 0,
  offsetY: 0,
  blurRadius: 0,
  spreadDistance: 0,
  color: "transparent",
  inset: false,
};

export const textShadow: StyleFunctionResolver = (resolveValue, func) => {
  const value = resolveValue(func[2]);

  // React Native draws one text shadow, so the first is the one the compiler keeps.
  const [shadow] =
    value === "none"
      ? [noTextShadow]
      : (readShadows(value, textShadowGrammar, resolveValue) ?? []);

  if (shadow === undefined) {
    return;
  }

  return {
    [ShortHandSymbol]: true,
    textShadowOffset: { width: shadow.offsetX, height: shadow.offsetY },
    textShadowRadius: shadow.blurRadius,
    textShadowColor: shadow.color,
  };
};
