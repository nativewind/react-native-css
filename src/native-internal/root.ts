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

declare global {
  var __react_native_css_non_inherited_variables: Set<string> | undefined;
}

// Pinned to globalThis like style-collection.ts and variables.tsx. The exports map splits
// import and require onto different builds and Metro resolves that per requesting module,
// so two copies of this file can load. StyleCollection is globalThis-pinned, so whichever
// copy wins it does all the injecting and fills ITS Set — a rules.ts bound to the other
// copy would read an empty one and the filter would silently never fire.
globalThis.__react_native_css_non_inherited_variables ??= new Set<string>();

export const nonInheritedVariables =
  globalThis.__react_native_css_non_inherited_variables;

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
