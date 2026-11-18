import type {
  Declaration,
  DimensionPercentageFor_LengthValue,
  Length,
  NumberOrPercentage,
  Rotate,
  Scale,
  TokenOrValue,
  Translate,
} from "lightningcss";

/**
 * Carries `translate`, `rotate` and `scale` across the first pass as the tokens
 * they were written as. lightningcss before
 * https://github.com/parcel-bundler/lightningcss/pull/1340 folds a parsed one
 * into `transform` when it serialises the rule, and passes an unparsed one
 * through in place.
 */
export function unparseIndividualTransform(
  declaration: Declaration,
): Declaration | undefined {
  switch (declaration.property) {
    case "translate": {
      const value = translateTokens(declaration.value);

      return value
        ? {
            property: "unparsed",
            value: { propertyId: { property: "translate" }, value },
          }
        : undefined;
    }
    case "rotate":
      return {
        property: "unparsed",
        value: {
          propertyId: { property: "rotate" },
          value: rotateTokens(declaration.value),
        },
      };
    case "scale":
      return {
        property: "unparsed",
        value: {
          propertyId: { property: "scale" },
          value: scaleTokens(declaration.value),
        },
      };
    default:
      return undefined;
  }
}

const WHITESPACE_TOKEN: TokenOrValue = {
  type: "token",
  value: { type: "white-space", value: " " },
};

const NONE_TOKENS: TokenOrValue[] = [
  { type: "token", value: { type: "ident", value: "none" } },
];

function spaceSeparated(tokens: TokenOrValue[]): TokenOrValue[] {
  return tokens.flatMap((token, index) =>
    index === 0 ? [token] : [WHITESPACE_TOKEN, token],
  );
}

function numberToken(value: number): TokenOrValue {
  return { type: "token", value: { type: "number", value } };
}

// lightningcss holds a percentage as its fraction, in a token as in a value: 50% is 0.5
function percentageToken(value: number): TokenOrValue {
  return { type: "token", value: { type: "percentage", value } };
}

function numberOrPercentageToken(value: NumberOrPercentage): TokenOrValue {
  return value.type === "number"
    ? numberToken(value.value)
    : percentageToken(value.value);
}

// No token holds a calc(), which React Native cannot take anyway: the compiler warns for one and ignores the declaration
function lengthToken(
  value: Length | DimensionPercentageFor_LengthValue,
): TokenOrValue | undefined {
  switch (value.type) {
    case "value":
    case "dimension":
      return { type: "length", value: value.value };
    case "percentage":
      return percentageToken(value.value);
    case "calc":
      return undefined;
  }
}

// A translate holding a calc() stays parsed, so it reaches the compiler's warning unless lightningcss folds it into a transform beside it
function translateTokens(value: Translate): TokenOrValue[] | undefined {
  if (value === "none") {
    return NONE_TOKENS;
  }

  const x = lengthToken(value.x);
  const y = lengthToken(value.y);
  const z = lengthToken(value.z);

  return x && y && z ? spaceSeparated([x, y, z]) : undefined;
}

function rotateTokens(value: Rotate): TokenOrValue[] {
  return spaceSeparated([
    numberToken(value.x),
    numberToken(value.y),
    numberToken(value.z),
    { type: "angle", value: value.angle },
  ]);
}

function scaleTokens(value: Scale): TokenOrValue[] {
  return value === "none"
    ? NONE_TOKENS
    : spaceSeparated([
        numberOrPercentageToken(value.x),
        numberOrPercentageToken(value.y),
        numberOrPercentageToken(value.z),
      ]);
}
