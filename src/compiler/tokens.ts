import type { LengthValue, TokenOrValue } from "lightningcss";

export const WHITESPACE_TOKEN: TokenOrValue = {
  type: "token",
  value: { type: "white-space", value: " " },
};

export const COMMA_TOKEN: TokenOrValue = {
  type: "token",
  value: { type: "comma" },
};

export function delimiterToken(value: string): TokenOrValue {
  return { type: "token", value: { type: "delim", value } };
}

export function identifierToken(value: string): TokenOrValue {
  return { type: "token", value: { type: "ident", value } };
}

export function numberToken(value: number): TokenOrValue {
  return { type: "token", value: { type: "number", value } };
}

/** lightningcss holds a percentage as its fraction, in a token as in a value: 50% is 0.5. */
export function percentageToken(fraction: number): TokenOrValue {
  return { type: "token", value: { type: "percentage", value: fraction } };
}

export function lengthToken(value: LengthValue): TokenOrValue {
  return { type: "length", value };
}

export function functionToken(
  name: string,
  argumentTokens: TokenOrValue[],
): TokenOrValue {
  return { type: "function", value: { name, arguments: argumentTokens } };
}

function joinTokens(
  groups: readonly TokenOrValue[][],
  separator: readonly TokenOrValue[],
): TokenOrValue[] {
  return groups.flatMap((group, index) =>
    index === 0 ? group : [...separator, ...group],
  );
}

export function spaceSeparated(
  groups: readonly TokenOrValue[][],
): TokenOrValue[] {
  return joinTokens(groups, [WHITESPACE_TOKEN]);
}

export function commaSeparated(
  groups: readonly TokenOrValue[][],
): TokenOrValue[] {
  return joinTokens(groups, [COMMA_TOKEN, WHITESPACE_TOKEN]);
}
