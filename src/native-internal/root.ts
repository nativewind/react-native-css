import { Platform, PlatformColor } from "react-native";

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

/**
 * The variables the runtime declares for itself rather than reading out of a
 * stylesheet. Applied again after every reset, because `rem` backs every
 * relative length and clearing it would resolve them all to nothing.
 */
function applyBuiltInVariables() {
  rootVariables("__rn-css-rem").set([[14]]);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  rootVariables("__rn-css-color").set([
    [
      Platform.OS === "ios"
        ? PlatformColor("label", "labelColor")
        : PlatformColor("?attr/textColorPrimary", "SystemBaseHighColor"),
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any);
}

/**
 * Drops every stylesheet-declared variable, from both the `:root` family and
 * the `*` family. Both are process-global and nothing else clears them, so a
 * harness that resets between cases needs this alongside
 * `StyleCollection.styles.clear()`.
 */
export function resetGlobalVariables() {
  rootVariables.clear();
  universalVariables.clear();
  applyBuiltInVariables();
}

applyBuiltInVariables();
