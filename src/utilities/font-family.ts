import { isStyleFunction } from "./style-descriptor";

// deferred: the first entry that could name a family is a var(), which resolves only at render
export type FontFamilyNarrowing =
  | { readonly kind: "family"; readonly family: string }
  | { readonly kind: "deferred" }
  | { readonly kind: "none" };

const DEFERRED: FontFamilyNarrowing = { kind: "deferred" };
const NONE: FontFamilyNarrowing = { kind: "none" };

// The first entry that names a family, reading nested groups in place and skipping one that names none
export function narrowFontFamily(value: unknown): FontFamilyNarrowing {
  if (typeof value === "string") {
    return { kind: "family", family: value };
  }

  if (!Array.isArray(value)) {
    return NONE;
  }

  if (isStyleFunction(value)) {
    return DEFERRED;
  }

  for (const entry of value) {
    const narrowing = narrowFontFamily(entry);

    if (narrowing.kind !== "none") {
      return narrowing;
    }
  }

  return NONE;
}
