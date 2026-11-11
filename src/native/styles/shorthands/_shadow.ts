import type { StyleDescriptor } from "react-native-css/compiler";
import { isStyleFunction } from "react-native-css/utilities";

import type { SimpleResolveValue } from "../resolve";

const currentColor: StyleDescriptor = [{}, "var", "__rn-css-color"];

/** What one shadow property accepts, as lightningcss parses it for the compiler. */
export interface ShadowGrammar {
  readonly maxLengths: 3 | 4;
  readonly acceptsInset: boolean;
}

export interface Shadow {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly blurRadius: number;
  readonly spreadDistance: number;
  readonly color: unknown;
  readonly inset: boolean;
}

/** Every shadow in a resolved list, or `undefined` when one is not a shadow, with the compiler's defaults for what it omits. */
export function readShadows(
  value: unknown,
  grammar: ShadowGrammar,
  resolveValue: SimpleResolveValue,
): readonly Shadow[] | undefined {
  const shadows: Shadow[] = [];

  for (const tokens of readCommaGroups(value)) {
    const shadow = readShadow(tokens, grammar, resolveValue);

    if (shadow === undefined) {
      return undefined;
    }

    shadows.push(shadow);
  }

  return shadows;
}

/** A `var()` that resolved to a list stands for its groups, and one that resolved to part of a shadow is spliced into it. */
function readCommaGroups(value: unknown): readonly (readonly unknown[])[] {
  if (!Array.isArray(value) || isStyleFunction(value)) {
    return [[value]];
  }

  return isGroupList(value)
    ? value.flatMap(readCommaGroups)
    : [spliceTokens(value)];
}

function isGroupList(value: readonly unknown[]): boolean {
  return (
    value.length > 0 &&
    value.every((entry) => Array.isArray(entry) && !isStyleFunction(entry))
  );
}

function spliceTokens(tokens: readonly unknown[]): readonly unknown[] {
  return tokens.flatMap((token) =>
    Array.isArray(token) && !isStyleFunction(token)
      ? spliceTokens(token)
      : [token],
  );
}

function readShadow(
  tokens: readonly unknown[],
  grammar: ShadowGrammar,
  resolveValue: SimpleResolveValue,
): Shadow | undefined {
  const lengths: number[] = [];
  let lengthsEnded = false;
  let color: unknown;
  let inset = false;

  for (const token of tokens) {
    if (typeof token === "number") {
      if (lengthsEnded || lengths.length === grammar.maxLengths) {
        return undefined;
      }

      lengths.push(token);
      continue;
    }

    lengthsEnded = lengths.length > 0;

    if (isInsetKeyword(token)) {
      if (!grammar.acceptsInset || inset) {
        return undefined;
      }

      inset = true;
    } else if (token === undefined || token === null || color !== undefined) {
      return undefined;
    } else {
      color = token;
    }
  }

  const [offsetX, offsetY, blurRadius = 0, spreadDistance = 0] = lengths;

  if (offsetX === undefined || offsetY === undefined) {
    return undefined;
  }

  return {
    offsetX,
    offsetY,
    blurRadius,
    spreadDistance,
    color: color ?? resolveValue(currentColor),
    inset,
  };
}

function isInsetKeyword(token: unknown): boolean {
  return typeof token === "string" && token.toLowerCase() === "inset";
}
