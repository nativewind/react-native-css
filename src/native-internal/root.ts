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
 * A CONCRETE scheme-aware color on every platform, never `PlatformColor`. This
 * value feeds every `currentcolor` consumer there is — `color`, `border-color`,
 * `outline-color`, ring and shadow — and on both platforms a semantic color
 * reaches at least one of those props by a path that never resolves it, failing
 * silently rather than throwing:
 *
 * - **Android.** `PlatformColor('?attr/textColorPrimary')` resolves to a
 *   ColorStateList, and `ColorPropConverter` returns the resource *reference*
 *   rather than an ARGB int, so default `ring-*` / `inset-ring-*` /
 *   `text-current` render nothing.
 * - **iOS.** A semantic color is a DYNAMIC `UIColor`, which must be resolved
 *   against a trait collection before it can become a `CGColor`.
 *   `RCTViewComponentView.mm` does that in exactly one place — the background —
 *   while border, outline and shadow take `RCTUIColorFromSharedColor(...)`
 *   `.CGColor` directly. facebook/react-native#57836 tracks the consequence:
 *   a dynamic `borderColor` / `outlineColor` resolves against the system
 *   appearance and ignores `overrideUserInterfaceStyle`, which paints the wrong
 *   variant — indistinguishable from no border when that variant happens to
 *   match what is behind it.
 *
 * A fallback is the one value that must not depend on the platform getting a
 * dynamic color right, because when it is wrong nothing reports it: both
 * platforms fail to a transparent or same-as-background paint, never an error.
 * A concrete color removes that class of failure from the fallback entirely.
 *
 * Scheme awareness comes from this same root observable's `prefers-color-scheme`
 * evaluation rather than a second `Appearance` listener. A binary black/white
 * default is spec-faithful: the root value is only the ultimate fallback, so any
 * ancestor-published or themed `--__rn-css-color` overrides it.
 */
rootVariables("__rn-css-color").set([
  ["#FFFFFF", [["=", "prefers-color-scheme", "dark"]]],
  ["#000000"],
]);
