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
    readonly kept: Readonly<Record<string, unknown>>;
    readonly openDefect: string;
  };
}

// Normalising the variable store instead would turn `font-family: var(--v)` over `--v: red` into "#f00"
const namedColour = (kept: string) => ({
  kept: { color: kept },
  openDefect:
    "the runtime hands React Native a colour read through a variable as the name it holds, where the compiler writes it as hex; processColor paints both alike",
});

const TOKEN_CENSUS: Record<RawTokenKind, readonly Shape[]> = {
  "ident": [
    { property: "position", value: "absolute" },
    { property: "color", value: "red", knownDivergence: namedColour("red") },
    {
      property: "color",
      value: "transparent",
      knownDivergence: namedColour("transparent"),
    },
    {
      property: "color",
      value: "rebeccapurple",
      knownDivergence: namedColour("rebeccapurple"),
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
        kept: { transform: [{ scale: 0.5 }] },
        openDefect:
          "the runtime writes a uniform scale as `scale`, where the compiler writes scaleX and scaleY; #389 writes the pair on both",
      },
    },
  ],
  "dimension": [
    {
      property: "transition-duration",
      value: "3s",
      knownDivergence: {
        kept: { transitionDuration: 3000 },
        openDefect:
          "a transition longhand read through a variable leaves its element unanimated and lands in the style, where the written one reaches the animation system",
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
        kept: { transform: [{ rotate: "45deg" }] },
        openDefect:
          "the runtime keeps `rotate`, where the compiler writes rotateZ; #389 writes rotateZ on both",
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
      knownDivergence: namedColour("teal"),
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

const SHORTHANDS: readonly Shape[] = (
  [
    ["margin", "margin"],
    ["padding", "padding"],
    ["border-width", "borderWidth"],
  ] as const
).map(([property, key]) => ({
  property,
  value: "1px 2px",
  knownDivergence: {
    kept: { [key]: [1, 2] },
    openDefect:
      "the runtime hands React Native a shorthand read through a variable as one list, which it does not read, where the compiler expands the written one into its sides",
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

type Path = "written" | "folded" | "kept";

function renderShape(shape: Shape, path: Path): Record<string, unknown> {
  const declarations =
    path === "written"
      ? `${shape.property}: ${shape.value};`
      : `--v: ${shape.value}; ${shape.property}: var(--v);`;

  // `--inner` and `--alpha` back the shapes whose value is itself a reference
  return renderStylesheet(
    `.a { --inner: teal; --alpha: 0.5; ${declarations} }`,
    "a",
    path !== "kept",
  );
}

test("the census covers something", () => {
  expect(SHAPES.length).toBeGreaterThan(20);
});

describe.each(SHAPES)("$property: var(--v) over $value", (shape) => {
  test("folding renders the written value", () => {
    expect(renderShape(shape, "folded")).toStrictEqual(
      renderShape(shape, "written"),
    );
  });

  test("a kept variable renders the written value, but for a named open defect", () => {
    const written = renderShape(shape, "written");
    const kept = renderShape(shape, "kept");

    if (shape.knownDivergence) {
      expect(kept).toStrictEqual(shape.knownDivergence.kept);
      return;
    }

    // A shape that renders nothing would agree vacuously
    expect(written).not.toStrictEqual({});
    expect(kept).toStrictEqual(written);
  });
});

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
  [
    "a nested reference to a variable declared initial",
    `.a { --scope-f: initial; --scope-g: var(--scope-f, 10px); width: var(--scope-g); }`,
    "a",
  ],
])("%s renders the same whether or not it folds", (_name, css, className) => {
  const folded = renderStylesheet(css, className, true);
  const kept = renderStylesheet(css, className, false);

  expect(folded).not.toStrictEqual({});
  expect(kept).toStrictEqual(folded);
});
