import { Appearance } from "react-native";

import type { ColorSchemeName } from "./runtime.types";

/**
 * `Appearance.setColorScheme` is not declared the same way across the supported
 * `react-native` range. Up to 0.85 it takes `"light" | "dark" | null | undefined`;
 * from 0.86 it takes `"light" | "dark" | "unspecified"` and rejects `null`. The two
 * parameter types overlap only on `"light" | "dark"`, so no single call can name the
 * "follow the system" value and type-check on both.
 *
 * The runtime is not split the same way: every version in the range hands
 * `"unspecified"` to the native module for that state, because 0.85 and earlier map
 * `null` to it on the way in. So only the declaration has to be restated, and only for
 * the one value the versions disagree about.
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
