import { Appearance } from "react-native";

import type { ColorSchemeName } from "./runtime.types";

/**
 * `Appearance.setColorScheme` is not declared the same way across the supported
 * `react-native` range. On 0.81 it takes `"light" | "dark" | null | undefined`; from
 * 0.82 it takes `"light" | "dark" | "unspecified"` and rejects `null`. The two
 * parameter types overlap only on `"light" | "dark"`, so no single call can name the
 * "follow the system" value and type-check on both.
 *
 * `"unspecified"` is the value that is right at runtime on every version: 0.82 and
 * later hand the argument straight to the native module, and 0.81 maps `null` to
 * `"unspecified"` before doing the same. So only the declaration has to be restated,
 * and only for the one value the versions disagree about.
 */
interface AppearanceColorSchemeReset {
  setColorScheme: (colorScheme: "unspecified") => void;
}

/**
 * Writes a color scheme to `Appearance` in a way that compiles and runs on every
 * `react-native` this package supports.
 */
export function setAppearanceColorScheme(value: ColorSchemeName): void {
  if (value === "light" || value === "dark") {
    // Declared identically by every version in the range.
    Appearance.setColorScheme(value);
    return;
  }

  (Appearance as unknown as AppearanceColorSchemeReset).setColorScheme(
    "unspecified",
  );
}
