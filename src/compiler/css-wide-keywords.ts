import type { TokenOrValue } from "lightningcss";

const CSS_WIDE_KEYWORDS = [
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
] as const;

export type CSSWideKeyword = (typeof CSS_WIDE_KEYWORDS)[number];

export function isCSSWideKeyword(keyword: string): keyword is CSSWideKeyword {
  return (CSS_WIDE_KEYWORDS as readonly string[]).includes(keyword);
}

export interface SoleCSSWideKeyword {
  keyword: CSSWideKeyword;
  written: string;
}

// A CSS-wide keyword is a value only on its own (css-values-4 §2.1), and a custom property's value keeps the whitespace around it
export function soleCSSWideKeyword(
  tokens: TokenOrValue[] | null | undefined,
): SoleCSSWideKeyword | undefined {
  const [token, ...rest] = (tokens ?? []).filter(
    (part) => part.type !== "token" || part.value.type !== "white-space",
  );

  if (
    token === undefined ||
    rest.length > 0 ||
    token.type !== "token" ||
    token.value.type !== "ident"
  ) {
    return;
  }

  const written = token.value.value;
  const keyword = written.toLowerCase();

  return isCSSWideKeyword(keyword) ? { keyword, written } : undefined;
}
