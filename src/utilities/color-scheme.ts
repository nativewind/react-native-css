export const LIGHT_DARK_FUNCTION = "lightDark";

/** The custom property an element's `color-scheme` publishes to its subtree */
export const COLOR_SCHEME_VARIABLE = "__rn-css-color-scheme";

export type UsedColorScheme = "light" | "dark";

/** CSS Color Adjust 1 §2.2: the schemes a `color-scheme` value supports; `normal` and a custom ident support none */
export function describeColorSchemeSupport(value: {
  readonly light: boolean;
  readonly dark: boolean;
}): string {
  const supported: UsedColorScheme[] = [];

  if (value.light) {
    supported.push("light");
  }

  if (value.dark) {
    supported.push("dark");
  }

  return supported.length > 0 ? supported.join(" ") : "normal";
}

/** CSS Color Adjust 1 §2.3: the preferred scheme when the element supports it, else the one it supports, else light */
export function resolveUsedColorScheme(
  support: unknown,
  preference: unknown,
): UsedColorScheme {
  const supported = readSupportedSchemes(support);
  const preferred: UsedColorScheme = preference === "dark" ? "dark" : "light";

  if (supported.includes(preferred)) {
    return preferred;
  }

  return supported.includes("dark") ? "dark" : "light";
}

function readSupportedSchemes(support: unknown): readonly unknown[] {
  if (Array.isArray(support)) {
    return support;
  }

  return typeof support === "string" ? support.split(" ") : [];
}
