import type { ColorSchemeName } from "react-native";

export type ResolvedColorScheme = "light" | "dark";

// A value that names no scheme states no preference, which MQ5 §12.5 answers with light
export function resolveColorScheme(
  value: ColorSchemeName | null | undefined,
): ResolvedColorScheme {
  return value === "light" || value === "dark" ? value : "light";
}
