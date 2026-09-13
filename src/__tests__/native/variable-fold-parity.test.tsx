import { render } from "@testing-library/react-native";
import type { TokenOrValue } from "lightningcss";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { StyleCollection } from "react-native-css/native";

/**
 * Whether the compiler folds a single-definition custom property into its use
 * sites is an OPTIMISATION. It must not be observable: the same stylesheet
 * compiled with the fold on and with the fold off has to render the same style.
 *
 * The census below is exhaustive over the value kinds lightningcss can put
 * inside a custom property, by construction — both records are keyed by the
 * lightningcss union itself, so a new member fails to compile until it is
 * censused here. An empty list is a kind that cannot be the whole value of a
 * custom property a React Native style consumes, and says why.
 */
type ValueKind = TokenOrValue["type"];
type RawTokenKind = Extract<TokenOrValue, { type: "token" }>["value"]["type"];

interface Shape {
  /** The property that reads the variable. */
  readonly property: string;
  /** The custom property's value. */
  readonly value: string;
  /**
   * A divergence this change does not close, with the reason it is out of
   * reach. Pinned as an exact pair so it cannot drift silently in either
   * direction: a NEW divergence fails, and so does one that quietly goes away.
   */
  readonly knownDivergence?: {
    readonly folded: Record<string, unknown>;
    readonly unfolded: Record<string, unknown>;
    readonly because: string;
  };
}

/**
 * A named CSS colour reaches the second pass as a bare ident, because
 * lightningcss only promotes a custom property's value to a colour node when it
 * is not expressible as one. The folded path then parses it under the consuming
 * property and canonicalises it; the unfolded path stores it under no property
 * at all, so it cannot. Normalising the store instead would break the reverse
 * case — `font-family: var(--v)` over `--v: red` renders "red" on BOTH paths
 * today and would start rendering "#f00" on one of them.
 */
const namedColour = (folded: string, unfolded: string) => ({
  folded: { color: folded },
  unfolded: { color: unfolded },
  because:
    "a named colour is an ident until a property gives it a type; the variable store has no property",
});

const TOKEN_CENSUS: Record<RawTokenKind, readonly Shape[]> = {
  "ident": [
    { property: "position", value: "absolute" },
    {
      property: "color",
      value: "red",
      knownDivergence: namedColour("#f00", "red"),
    },
    {
      property: "color",
      value: "transparent",
      knownDivergence: namedColour("#0000", "transparent"),
    },
    {
      property: "color",
      value: "rebeccapurple",
      knownDivergence: namedColour("#639", "rebeccapurple"),
    },
  ],
  "string": [{ property: "font-family", value: '"Inter"' }],
  "number": [
    { property: "flex-grow", value: "2" },
    { property: "width", value: "0" },
    { property: "opacity", value: "0" },
    { property: "z-index", value: "3" },
  ],
  "percentage": [{ property: "width", value: "50%" }],
  "dimension": [
    {
      property: "transition-duration",
      value: "3s",
      knownDivergence: {
        folded: {},
        unfolded: { transitionDuration: 3000 },
        because:
          "folding routes the duration to the animation system, which paints nothing; not folding leaks it into the static style. A transition gap, not a variable one",
      },
    },
  ],
  "delim": [
    { property: "aspect-ratio", value: "16 / 9" },
    // A square ratio has a second canonical form, and the property parser
    // picks it.
    { property: "aspect-ratio", value: "3 / 3" },
  ],
  "hash": [{ property: "color", value: "#123456" }],
  // Not reachable as the whole value of a custom property a style consumes.
  "at-keyword": [],
  "id-hash": [],
  "unquoted-url": [],
  "white-space": [],
  "comment": [],
  "colon": [],
  "semicolon": [],
  "comma": [],
  "include-match": [],
  "dash-match": [],
  "prefix-match": [],
  "suffix-match": [],
  "substring-match": [],
  "cdo": [],
  "cdc": [],
  "function": [],
  "parenthesis-block": [],
  "square-bracket-block": [],
  "curly-bracket-block": [],
  "bad-url": [],
  "bad-string": [],
  "close-parenthesis": [],
  "close-square-bracket": [],
  "close-curly-bracket": [],
};

const VALUE_CENSUS: Record<ValueKind, readonly Shape[]> = {
  "token": Object.values(TOKEN_CENSUS).flat(),
  "color": [
    { property: "color", value: "#12345678" },
    { property: "color", value: "rgba(255, 0, 0, 0.5)" },
    { property: "color", value: "oklch(63.7% 0.237 25.331)" },
  ],
  "length": [
    { property: "width", value: "10px" },
    { property: "width", value: "0px" },
    { property: "margin-top", value: "-4px" },
    { property: "width", value: "1rem" },
  ],
  "angle": [
    {
      property: "rotate",
      value: "45deg",
      knownDivergence: {
        folded: { transform: [{ rotateZ: "45deg" }] },
        unfolded: { transform: [{ rotate: "45deg" }] },
        because:
          "`rotate` is renamed to `rotateZ` by the static parser and left alone by the runtime one; fold-independent, and closing it is a runtime shorthand change",
      },
    },
  ],
  "function": [
    { property: "width", value: "calc(10px + 2px)" },
    { property: "transform", value: "translateX(10px)" },
  ],
  "var": [
    {
      property: "color",
      value: "var(--inner)",
      knownDivergence: namedColour("#008080", "teal"),
    },
  ],
  // Both paths agree, and both are wrong about the red channel by a factor of
  // 255. That is `parseUnresolvedColor`'s bug, not a fold one, and parity is
  // all this census claims.
  "unresolved-color": [
    { property: "color", value: "rgb(255 0 0 / var(--alpha))" },
  ],
  // Not reachable, or not a style value React Native consumes.
  "url": [],
  "env": [],
  "time": [],
  "resolution": [],
  "dashed-ident": [],
  "animation-name": [],
};

/**
 * Shorthands are a second fold-independent class: the static parser expands
 * them into their longhands, the runtime one hands React Native the raw list.
 * Same shape as the `rotate` entry above, kept apart because it is a family.
 */
const SHORTHANDS: readonly Shape[] = (
  [
    [
      "margin",
      "1px 2px",
      "marginTop",
      "marginBottom",
      "marginLeft",
      "marginRight",
    ],
    [
      "padding",
      "1px 2px",
      "paddingTop",
      "paddingBottom",
      "paddingLeft",
      "paddingRight",
    ],
    [
      "border-width",
      "1px 2px",
      "borderTopWidth",
      "borderBottomWidth",
      "borderLeftWidth",
      "borderRightWidth",
    ],
  ] as const
).map(([property, value, top, bottom, left, right]) => ({
  property,
  value,
  knownDivergence: {
    folded: { [top]: 1, [bottom]: 1, [left]: 2, [right]: 2 },
    unfolded: { [property.replace("-w", "W")]: [1, 2] },
    because:
      "the static parser expands the shorthand, the runtime one does not; fold-independent, and closing it needs a runtime shorthand handler",
  },
}));

const SHAPES: readonly Shape[] = [
  ...Object.values(VALUE_CENSUS).flat(),
  ...SHORTHANDS,
];

function renderShape(
  shape: Shape,
  inlineVariables: boolean,
): Record<string, unknown> {
  // `--inner` and `--alpha` back the two shapes whose value is itself a
  // reference; every other shape ignores them.
  const css = `.a { --inner: teal; --alpha: 0.5; --v: ${shape.value}; ${shape.property}: var(--v); }`;
  StyleCollection.styles.clear();
  registerCSS(css, inlineVariables ? {} : { inlineVariables: false });
  const { style } = render(<View testID={testID} className="a" />).getByTestId(
    testID,
  ).props as { style?: Record<string, unknown> };

  return style ?? {};
}

test("the census covers something", () => {
  // Deriving the table from a union buys a drift failure at the cost of a
  // vacuity one: every list could be empty and every case below would vanish.
  expect(SHAPES.length).toBeGreaterThan(20);
});

describe.each(SHAPES)("$property: var(--v) over $value", (shape) => {
  test("the fold decision is unobservable", () => {
    const folded = renderShape(shape, true);
    const unfolded = renderShape(shape, false);

    if (shape.knownDivergence) {
      expect(folded).toStrictEqual(shape.knownDivergence.folded);
      expect(unfolded).toStrictEqual(shape.knownDivergence.unfolded);
      return;
    }

    // A shape that renders nothing on both paths agrees vacuously, which is
    // exactly how a typo in the census would pass.
    expect(folded).not.toStrictEqual({});
    expect(unfolded).toStrictEqual(folded);
  });
});
