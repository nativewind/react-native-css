import { StyleSheet } from "react-native";

import { render } from "@testing-library/react-native";
import type { TokenOrValue } from "lightningcss";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { StyleCollection } from "react-native-css/native";

// Keyed by lightningcss's own unions, so a value kind it adds fails to compile until it is listed here
type ValueKind = TokenOrValue["type"];
type RawTokenKind = Extract<TokenOrValue, { type: "token" }>["value"]["type"];

interface Shape {
  readonly property: string;
  readonly value: string;
  readonly knownDivergence?: {
    readonly folded: Record<string, unknown>;
    readonly unfolded: Record<string, unknown>;
    readonly because: string;
  };
}

// Normalising the variable store instead would turn `font-family: var(--v)` over `--v: red` into "#f00"
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
  "percentage": [
    { property: "width", value: "50%" },
    {
      property: "scale",
      value: "50%",
      knownDivergence: {
        folded: { transform: [{ scaleX: 0.5 }, { scaleY: 0.5 }] },
        unfolded: { transform: [{ scale: 0.5 }] },
        because:
          "the static parser writes a uniform scale as both axes and the runtime one as `scale`; fold-independent, and closing it is a runtime transform change",
      },
    },
  ],
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
    // The property parser writes a square ratio as 1
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
  // Both paths share parseUnresolvedColor's channel scale, so only their agreement is claimed here
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

// The static parser expands a shorthand into its longhands, and the runtime one hands React Native the list
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

const SHADOW_LISTS: readonly Shape[] = [
  { property: "box-shadow", value: "1px 2px 3px 4px #123456" },
  { property: "box-shadow", value: "0 0 #0000, 1px 2px 3px 4px #123456" },
  { property: "box-shadow", value: "0 0 transparent" },
];

const SHAPES: readonly Shape[] = [
  ...Object.values(VALUE_CENSUS).flat(),
  ...SHORTHANDS,
  ...SHADOW_LISTS,
];

function renderShape(
  shape: Shape,
  inlineVariables: boolean,
): Record<string, unknown> {
  // `--inner` and `--alpha` back the shapes whose value is itself a reference
  const css = `.a { --inner: teal; --alpha: 0.5; --v: ${shape.value}; ${shape.property}: var(--v); }`;
  StyleCollection.styles.clear();
  registerCSS(css, inlineVariables ? {} : { inlineVariables: false });
  const { style } = render(<View testID={testID} className="a" />).getByTestId(
    testID,
  ).props as { style?: Record<string, unknown> | Record<string, unknown>[] };

  return StyleSheet.flatten<Record<string, unknown>>(style ?? {});
}

test("the census covers something", () => {
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

    // A shape that renders nothing on both paths would agree vacuously
    expect(folded).not.toStrictEqual({});
    expect(unfolded).toStrictEqual(folded);
  });
});

function renderStylesheet(
  css: string,
  className: string,
  inlineVariables: boolean,
): Record<string, unknown> {
  StyleCollection.styles.clear();
  registerCSS(css, inlineVariables ? {} : { inlineVariables: false });
  const { style } = render(
    <View testID={testID} className={className} />,
  ).getByTestId(testID).props as {
    style?: Record<string, unknown> | Record<string, unknown>[];
  };

  return StyleSheet.flatten<Record<string, unknown>>(style ?? {});
}

// Each case names its own properties, because root and universal variables outlive a test
test.each([
  [
    "a declaration in a rule the element does not match",
    `.p { --scope-a: 10px; } .a { width: var(--scope-a); height: 5px; }`,
    "a",
  ],
  [
    "a declaration another rule on the element also reads",
    `.a { --scope-b: 10px; width: var(--scope-b); } .b { height: var(--scope-b); }`,
    "a b",
  ],
  [
    "a registered initial value beside a fallback block the compiler drops",
    `@property --scope-c { syntax: "*"; inherits: false; initial-value: 10px; }
     @supports (display: grid) { *, ::before { --scope-c: 20px; } }
     .a { width: var(--scope-c); }`,
    "a",
  ],
  [
    "a declaration inside an @supports block the compiler keeps",
    `@supports (color: color-mix(in lab, red, red)) { :root { --scope-d: 10px; } }
     .a { width: var(--scope-d); }`,
    "a",
  ],
  [
    "a declaration on every element, registered inherits: false",
    `@property --scope-e { syntax: "<length>"; inherits: false; initial-value: 0px; }
     * { --scope-e: 10px; }
     .a { width: var(--scope-e); }`,
    "a",
  ],
])("%s renders the same whether or not it folds", (_name, css, className) => {
  const folded = renderStylesheet(css, className, true);
  const unfolded = renderStylesheet(css, className, false);

  expect(folded).not.toStrictEqual({});
  expect(unfolded).toStrictEqual(folded);
});
