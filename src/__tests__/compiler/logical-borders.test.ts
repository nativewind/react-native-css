import { compile } from "react-native-css/compiler";

const getRule = (css: string) => {
  const compiled = compile(`.my-class { ${css} }`);
  return {
    rule: compiled.stylesheet().s?.find((rule) => rule[0] === "my-class")?.[1],
    warnings: compiled.warnings(),
  };
};

describe("logical border colors", () => {
  test("border-inline-start-color", () => {
    expect(getRule("border-inline-start-color: red;").rule).toStrictEqual([
      { s: [1, 1], d: [{ borderStartColor: "#f00" }] },
    ]);
  });

  test("border-inline-end-color", () => {
    expect(getRule("border-inline-end-color: red;").rule).toStrictEqual([
      { s: [1, 1], d: [{ borderEndColor: "#f00" }] },
    ]);
  });

  test("border-inline-color", () => {
    expect(getRule("border-inline-color: red;").rule).toStrictEqual([
      { s: [1, 1], d: [{ borderStartColor: "#f00", borderEndColor: "#f00" }] },
    ]);
  });

  // nativewind/nativewind#1737: colors that resolve at runtime take the
  // unparsed path, which previously skipped the border-inline-* renames
  test("border-inline-start-color with var()", () => {
    expect(
      getRule("border-inline-start-color: hsl(var(--primary));").rule,
    ).toStrictEqual([
      {
        s: [1, 1],
        d: [[[{}, "hsl", [{}, "var", "primary", 1]], "borderStartColor", 1]],
        dv: 1,
      },
    ]);
  });
});

describe("logical border widths", () => {
  test("border-inline-start-width", () => {
    expect(getRule("border-inline-start-width: 2px;").rule).toStrictEqual([
      { s: [1, 1], d: [{ borderStartWidth: 2 }] },
    ]);
  });

  test("border-inline-end-width", () => {
    expect(getRule("border-inline-end-width: 2px;").rule).toStrictEqual([
      { s: [1, 1], d: [{ borderEndWidth: 2 }] },
    ]);
  });

  test("border-inline-width", () => {
    expect(getRule("border-inline-width: 2px;").rule).toStrictEqual([
      { s: [1, 1], d: [{ borderStartWidth: 2, borderEndWidth: 2 }] },
    ]);
  });
});

describe("logical border shorthands", () => {
  test("border-inline-start", () => {
    expect(getRule("border-inline-start: 2px solid red;").rule).toStrictEqual([
      { s: [1, 1], d: [{ borderStartColor: "#f00", borderStartWidth: 2 }] },
    ]);
  });

  test("border-inline-end", () => {
    expect(getRule("border-inline-end: 2px solid red;").rule).toStrictEqual([
      { s: [1, 1], d: [{ borderEndColor: "#f00", borderEndWidth: 2 }] },
    ]);
  });

  test("border-inline", () => {
    expect(getRule("border-inline: 2px solid red;").rule).toStrictEqual([
      {
        s: [1, 1],
        d: [
          {
            borderStartColor: "#f00",
            borderEndColor: "#f00",
            borderStartWidth: 2,
            borderEndWidth: 2,
          },
        ],
      },
    ]);
  });
});

describe("logical border styles", () => {
  // React Native only has a uniform borderStyle. solid matches the native
  // default and is dropped silently, anything else drops with a warning
  test("border-inline-start-style: solid is dropped without warning", () => {
    const { rule, warnings } = getRule("border-inline-start-style: solid;");
    expect(rule).toBeUndefined();
    expect(warnings).toStrictEqual({});
  });

  test("border-inline-start-style: dashed is dropped with a warning", () => {
    const { rule, warnings } = getRule("border-inline-start-style: dashed;");
    expect(rule).toBeUndefined();
    expect(warnings).toStrictEqual({
      values: { "border-inline-start-style": ["dashed"] },
    });
  });

  test("border-inline shorthand with a dashed style warns", () => {
    const { warnings } = getRule("border-inline: 2px dashed red;");
    expect(warnings).toStrictEqual({
      values: { "border-inline-style": ["dashed"] },
    });
  });
});

describe("logical border styles via var() (unparsed path)", () => {
  /**
   * A var() keeps the declaration unparsed, so its value is unknown at compile
   * time. React Native has no per-side border style either way, so the
   * declaration drops — and an unknown value is not a known non-solid one, so
   * it drops as quietly as `solid` does. Tailwind v4 puts every
   * `border-{x,s,e}-*` utility through here via `var(--tw-border-style)`.
   */
  test.each([
    "border-inline-style",
    "border-inline-start-style",
    "border-inline-end-style",
  ])("%s with a var() drops without warning", (property) => {
    const { rule, warnings } = getRule(`${property}: var(--tw-border-style);`);

    expect(rule).toBeUndefined();
    expect(warnings).toStrictEqual({});
  });

  test("a var() style leaves the width beside it alone", () => {
    const { rule, warnings } = getRule(
      "border-inline-start-style: var(--tw-border-style); border-inline-start-width: 1px;",
    );

    expect(rule).toStrictEqual([{ s: [1, 1], d: [{ borderStartWidth: 1 }] }]);
    expect(warnings).toStrictEqual({});
  });

  test("a var() style over the whole inline axis leaves both widths alone", () => {
    const { rule, warnings } = getRule(
      "border-inline-style: var(--tw-border-style); border-inline-width: 1px;",
    );

    expect(rule).toStrictEqual([
      { s: [1, 1], d: [{ borderStartWidth: 1, borderEndWidth: 1 }] },
    ]);
    expect(warnings).toStrictEqual({});
  });
});

describe("a two-edge logical property via var() compiles to a runtime call", () => {
  // An axis colour lands on its edge pair as two declarations, so a later edge colour replaces it in cascade order
  test.each([
    [
      "border-inline-color: hsl(var(--primary));",
      ["borderStartColor", "borderEndColor"],
      [{}, "hsl", [{}, "var", "primary", 1]],
      [{}, "hsl", [{}, "var", "primary", 1]],
    ],
    [
      "border-inline-color: var(--c);",
      ["borderStartColor", "borderEndColor"],
      [{}, "var", "c", 1],
      [{}, "var", "c", 1],
    ],
    [
      "border-inline-color: var(--c, red);",
      ["borderStartColor", "borderEndColor"],
      [{}, "var", ["c", "red"], 1],
      [{}, "var", ["c", "red"], 1],
    ],
    [
      "border-inline-color: var(--a) var(--b);",
      ["borderStartColor", "borderEndColor"],
      [{}, "var", "a", 1],
      [{}, "var", "b", 1],
    ],
    [
      "border-inline-color: red var(--b);",
      ["borderStartColor", "borderEndColor"],
      "red",
      [{}, "var", "b", 1],
    ],
    [
      "border-block-color: var(--c);",
      ["borderTopColor", "borderBottomColor"],
      [{}, "var", "c", 1],
      [{}, "var", "c", 1],
    ],
    [
      "border-block-color: var(--a) var(--b);",
      ["borderTopColor", "borderBottomColor"],
      [{}, "var", "a", 1],
      [{}, "var", "b", 1],
    ],
  ] as const)(
    "%s lands on its edge pair",
    (css, [startKey, endKey], start, end) => {
      const { rule, warnings } = getRule(css);

      expect(rule).toStrictEqual([
        {
          s: [1, 1],
          d: [
            // A literal edge is static, a var() edge resolves in place
            typeof start === "string"
              ? { [startKey]: start }
              : [start, startKey, 1],
            [end, endKey, 1],
          ],
          dv: 1,
        },
      ]);
      expect(warnings).toStrictEqual({});
    },
  );

  // A var() can substitute any number of values, so the runtime handler reads the arity once it resolves, as it does for border
  test.each([
    [
      "border-inline-width: var(--w);",
      "borderInlineWidth",
      [{}, "var", "w", 1],
    ],
    [
      "border-inline-width: var(--w, 3px);",
      "borderInlineWidth",
      [{}, "var", ["w", 3], 1],
    ],
    [
      "border-inline-width: calc(var(--w) * 2);",
      "borderInlineWidth",
      [{}, "calc", [[{}, "var", "w", 1], "*", 2]],
    ],
    [
      "border-inline-width: var(--a) var(--b);",
      "borderInlineWidth",
      [
        [{}, "var", "a", 1],
        [{}, "var", "b", 1],
      ],
    ],
    [
      "border-inline-width: var(--a) var(--b) var(--c);",
      "borderInlineWidth",
      [
        [{}, "var", "a", 1],
        [{}, "var", "b", 1],
        [{}, "var", "c", 1],
      ],
    ],
    [
      "border-inline-width: 1px var(--b);",
      "borderInlineWidth",
      [1, [{}, "var", "b", 1]],
    ],
    ["border-block-width: var(--w);", "borderBlockWidth", [{}, "var", "w", 1]],
    [
      "border-block-width: var(--a) var(--b);",
      "borderBlockWidth",
      [
        [{}, "var", "a", 1],
        [{}, "var", "b", 1],
      ],
    ],
    [
      "border-block-width: var(--a) var(--b) var(--c);",
      "borderBlockWidth",
      [
        [{}, "var", "a", 1],
        [{}, "var", "b", 1],
        [{}, "var", "c", 1],
      ],
    ],
  ] as const)("%s", (css, resolver, args) => {
    const { rule, warnings } = getRule(css);

    expect(rule).toStrictEqual([
      { s: [1, 1], d: [[[{}, resolver, args, 1], resolver, 1]], dv: 1 },
    ]);
    expect(warnings).toStrictEqual({});
  });

  test("a value that compiles to nothing declares nothing", () => {
    const { rule, warnings } = getRule("border-inline-color: inherit;");

    expect(rule).toBeUndefined();
    expect(warnings).toStrictEqual({
      values: { "border-inline-color": ["inherit"] },
    });
  });
});

/**
 * The block axis, which React Native supports differently from the inline one.
 *
 * The per-EDGE block colours are real props — `borderBlockStartColor` and
 * `borderBlockEndColor` are in `ReactNativeStyleAttributes`, in both
 * `BaseViewConfig`s and in `ViewStyle` — and each is the highest-precedence
 * name for its edge on both platforms, so they are emitted as-is. The block
 * WIDTHS appear only in `BaseViewConfig.ios.js`, so emitting them paints on
 * iOS and nowhere else, and the axis-wide `borderBlockColor` is real but
 * ordered against `borderTopColor` oppositely by the two platforms; both map
 * to the physical edges instead. `direction` never flips the block axis, so
 * block-start is the top edge on every platform.
 */
describe("block border widths", () => {
  test("border-block-start-width", () => {
    expect(getRule("border-block-start-width: 2px;").rule).toStrictEqual([
      { s: [1, 1], d: [{ borderTopWidth: 2 }] },
    ]);
  });

  test("border-block-end-width", () => {
    expect(getRule("border-block-end-width: 2px;").rule).toStrictEqual([
      { s: [1, 1], d: [{ borderBottomWidth: 2 }] },
    ]);
  });

  test("border-block-width", () => {
    expect(getRule("border-block-width: 2px;").rule).toStrictEqual([
      { s: [1, 1], d: [{ borderTopWidth: 2, borderBottomWidth: 2 }] },
    ]);
  });

  test("border-block-width with two values", () => {
    expect(getRule("border-block-width: 1px 2px;").rule).toStrictEqual([
      { s: [1, 1], d: [{ borderTopWidth: 1, borderBottomWidth: 2 }] },
    ]);
  });
});

describe("block border colors", () => {
  test.each([
    ["border-block-start-color", "borderBlockStartColor"],
    ["border-block-end-color", "borderBlockEndColor"],
  ])("%s keeps React Native's own prop", (property, key) => {
    expect(getRule(`${property}: red;`).rule).toStrictEqual([
      { s: [1, 1], d: [{ [key]: "#f00" }] },
    ]);
  });

  test("border-block-color reaches the edge pair", () => {
    expect(getRule("border-block-color: red;").rule).toStrictEqual([
      { s: [1, 1], d: [{ borderTopColor: "#f00", borderBottomColor: "#f00" }] },
    ]);
  });
});

describe("block border styles", () => {
  // React Native has no per-edge border style on either axis.
  test.each([
    "border-block-style",
    "border-block-start-style",
    "border-block-end-style",
  ])("%s: solid is dropped without warning", (property) => {
    const { rule, warnings } = getRule(`${property}: solid;`);

    expect(rule).toBeUndefined();
    expect(warnings).toStrictEqual({});
  });

  test("border-block-start-style: dashed is dropped with a warning", () => {
    const { rule, warnings } = getRule("border-block-start-style: dashed;");

    expect(rule).toBeUndefined();
    expect(warnings).toStrictEqual({
      values: { "border-block-start-style": ["dashed"] },
    });
  });

  test("border-block-style: two values warn per edge", () => {
    expect(
      getRule("border-block-style: dashed dotted;").warnings,
    ).toStrictEqual({
      values: {
        "border-block-start-style": ["dashed"],
        "border-block-end-style": ["dotted"],
      },
    });
  });
});

describe("block border shorthands", () => {
  test("border-block", () => {
    expect(getRule("border-block: 2px solid red;").rule).toStrictEqual([
      {
        s: [1, 1],
        d: [
          {
            borderTopColor: "#f00",
            borderBottomColor: "#f00",
            borderTopWidth: 2,
            borderBottomWidth: 2,
          },
        ],
      },
    ]);
  });

  test("border-block-start", () => {
    expect(getRule("border-block-start: 2px solid red;").rule).toStrictEqual([
      { s: [1, 1], d: [{ borderBlockStartColor: "#f00", borderTopWidth: 2 }] },
    ]);
  });

  test("border-block-end", () => {
    expect(getRule("border-block-end: 2px solid red;").rule).toStrictEqual([
      {
        s: [1, 1],
        d: [{ borderBlockEndColor: "#f00", borderBottomWidth: 2 }],
      },
    ]);
  });

  test("a block shorthand with a dashed style warns", () => {
    expect(getRule("border-block: 2px dashed red;").warnings).toStrictEqual({
      values: { "border-block-style": ["dashed"] },
    });
  });
});

describe("block borders via var() (unparsed path)", () => {
  test.each([
    ["border-block-start-width", "borderTopWidth"],
    ["border-block-end-width", "borderBottomWidth"],
  ])("%s renames on the unparsed path too", (property, key) => {
    expect(getRule(`${property}: var(--w);`).rule).toStrictEqual([
      { s: [1, 1], d: [[[{}, "var", "w", 1], key, 1]], dv: 1 },
    ]);
  });

  test.each([
    "border-block-style",
    "border-block-start-style",
    "border-block-end-style",
  ])("%s with a var() drops without warning", (property) => {
    const { rule, warnings } = getRule(`${property}: var(--tw-border-style);`);

    expect(rule).toBeUndefined();
    expect(warnings).toStrictEqual({});
  });
});
