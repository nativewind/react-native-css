import { isStyleFunction } from "./style-descriptor";

// deferred: the stack holds a var(), which resolves only at render and can still invalidate it
export type FontFamilyNarrowing =
  | { readonly kind: "family"; readonly family: string }
  | { readonly kind: "deferred" }
  | { readonly kind: "none" };

const DEFERRED: FontFamilyNarrowing = { kind: "deferred" };
const NONE: FontFamilyNarrowing = { kind: "none" };

// css-values-4 §6.1: an unquoted family name is never a CSS-wide keyword or `default`
const RESERVED_IDENTS: ReadonlySet<string> = new Set([
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
  "default",
]);

export function isReservedFamilyIdent(ident: string): boolean {
  return RESERVED_IDENTS.has(ident.toLowerCase());
}

// css-fonts-4 §4.2: a stack is valid only when every entry names a family, and React Native takes its first
export function narrowFontFamily(value: unknown): FontFamilyNarrowing {
  if (typeof value === "string") {
    return { kind: "family", family: value };
  }

  if (!Array.isArray(value)) {
    return NONE;
  }

  if (isStyleFunction(value)) {
    return value[1] === "var" ? DEFERRED : NONE;
  }

  let narrowing: FontFamilyNarrowing = NONE;

  for (const entry of value) {
    const entryNarrowing = narrowFontFamily(entry);

    switch (entryNarrowing.kind) {
      case "none":
        return NONE;
      case "deferred":
        narrowing = DEFERRED;
        break;
      case "family":
        if (narrowing.kind === "none") {
          narrowing = entryNarrowing;
        }
        break;
      default:
        entryNarrowing satisfies never;
    }
  }

  return narrowing;
}
