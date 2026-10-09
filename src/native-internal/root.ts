import type { StyleDescriptor, VariableValue } from "react-native-css/compiler";

import { testMediaQuery } from "../native/conditions/media-query";
import { family, observable, type Observable } from "../native/reactivity";

const rootVariableFamily = () => {
  return family<string, Observable<StyleDescriptor, VariableValue[]>>(() => {
    const obs = observable<StyleDescriptor, VariableValue[]>(
      (read, variableValue) => {
        if (!variableValue) return undefined;

        for (const [value, mediaQuery] of variableValue) {
          if (!mediaQuery) {
            return value;
          }

          if (testMediaQuery(mediaQuery, read)) {
            return value;
          }
        }

        return undefined;
      },
    );

    return obs;
  });
};

export const rootVariables = rootVariableFamily();
export const universalVariables = rootVariableFamily();

rootVariables("__rn-css-rem").set([[14]]);

/**
 * `color`'s initial value, `CanvasText` (CSS Color 4): black, or white in a dark scheme.
 * Concrete rather than `PlatformColor`, because Android's border, ring and shadow paths
 * and iOS's border, outline and shadow paths never resolve a semantic color
 * (facebook/react-native#57836), so a semantic fallback paints nothing.
 */
rootVariables("__rn-css-color").set([
  ["#FFFFFF", [["=", "prefers-color-scheme", "dark"]]],
  ["#000000"],
]);
