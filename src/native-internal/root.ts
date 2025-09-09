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
