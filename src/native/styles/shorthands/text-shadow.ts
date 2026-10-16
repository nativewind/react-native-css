import { NO_TEXT_SHADOW } from "react-native-css/utilities";

import { ShortHandSymbol } from "../constants";
import type { StyleFunctionResolver } from "../resolve";
import { readShadows, type ShadowGrammar } from "./_shadow";

const textShadowGrammar: ShadowGrammar = { maxLengths: 4, acceptsInset: false };

export const textShadow: StyleFunctionResolver = (resolveValue, func) => {
  const value = resolveValue(func[2]);

  // React Native draws one text shadow, so the first is the one the compiler keeps.
  const shadow =
    value === "none"
      ? NO_TEXT_SHADOW
      : readShadows(value, textShadowGrammar, resolveValue)?.[0];

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
