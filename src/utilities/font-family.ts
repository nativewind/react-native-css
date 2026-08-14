import { isStyleFunction } from "./style-descriptor";

/**
 * What a `font-family` stack reduces to.
 *
 * `deferred` is the answer the compiler cannot give: the first entry that could
 * name a family is a variable reference, and its value only exists at render.
 */
export type FontFamilyNarrowing =
  | { readonly kind: "family"; readonly family: string }
  | { readonly kind: "deferred" }
  | { readonly kind: "none" };

const DEFERRED: FontFamilyNarrowing = { kind: "deferred" };
const NONE: FontFamilyNarrowing = { kind: "none" };

/**
 * React Native's `fontFamily` is one family name, never a stack, so every
 * `font-family` a stylesheet produces has to reduce to a single family.
 *
 * The reduction is flatten-then-first-usable: the stack is read left to right,
 * a nested group is read in place, and an entry that cannot name a family — a
 * number, a null, an empty group — is skipped, the way a browser skips a family
 * it cannot use. Taking `[0]` and descending into it instead loses every
 * sibling standing behind an unusable first entry.
 */
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
