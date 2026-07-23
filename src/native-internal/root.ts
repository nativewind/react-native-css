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

/**
 * The ultimate fallback for every `currentcolor` (and `color: inherit`)
 * resolution that reaches the root with no ancestor- or theme-published
 * `--__rn-css-color`.
 *
 * iOS keeps `PlatformColor('label')` — a first-class dynamic color that already
 * tracks the system appearance.
 *
 * Android's `PlatformColor('?attr/textColorPrimary')` resolves to a
 * ColorStateList, and RN's `ColorPropConverter` returns the resource
 * *reference* rather than an ARGB int, so it silently never paints — default
 * `ring-*` / `inset-ring-*` / `text-current` render nothing. Seed a concrete
 * color instead, made scheme-aware through this same root observable's
 * `prefers-color-scheme` evaluation (no extra `Appearance` listener). A binary
 * black/white default is spec-faithful: the root value is only the ultimate
 * fallback, so any ancestor-published or themed `--__rn-css-color` overrides it.
 */
if (Platform.OS === "ios") {
  // PlatformColor returns an OpaqueColorValue that isn't in the StyleDescriptor
  // union, but the native runtime consumes it as a color.
  const iosLabelColor = PlatformColor(
    "label",
    "labelColor",
  ) as unknown as StyleDescriptor;
  rootVariables("__rn-css-color").set([[iosLabelColor]]);
} else {
  rootVariables("__rn-css-color").set([
    ["#FFFFFF", [["=", "prefers-color-scheme", "dark"]]],
    ["#000000"],
  ]);
}
