import { ShortHandSymbol } from "../constants";
import type { StyleFunctionResolver } from "../resolve";
import { readShadows, type ShadowGrammar } from "./_shadow";

const textShadowGrammar: ShadowGrammar = { maxLengths: 4, acceptsInset: false };

export const textShadow: StyleFunctionResolver = (resolveValue, func) => {
  // React Native draws one text shadow, so the first is the one the compiler keeps.
  const [shadow] =
    readShadows(resolveValue(func[2]), textShadowGrammar, resolveValue) ?? [];

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
