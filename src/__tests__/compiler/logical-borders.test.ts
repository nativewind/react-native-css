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

describe("logical border shorthands via var() (unparsed path)", () => {
  // A var() forces a shorthand onto the unparsed path, where propertyRename
  // (longhands only) and the parseBorderInline* parsers (parsed path only) do
  // not reach. These must still expand to the RTL-aware start/end props.
  test("border-inline-color with var()", () => {
    expect(
      getRule("border-inline-color: hsl(var(--primary));").rule,
    ).toStrictEqual([
      {
        s: [1, 1],
        d: [
          [[{}, "hsl", [{}, "var", "primary", 1]], "borderStartColor", 1],
          [[{}, "hsl", [{}, "var", "primary", 1]], "borderEndColor", 1],
        ],
        dv: 1,
      },
    ]);
  });

  test("border-inline-width with var()", () => {
    expect(getRule("border-inline-width: var(--w);").rule).toStrictEqual([
      {
        s: [1, 1],
        d: [
          [[{}, "var", "w", 1], "borderStartWidth", 1],
          [[{}, "var", "w", 1], "borderEndWidth", 1],
        ],
        dv: 1,
      },
    ]);
  });

  test("border-inline-color with a bare var()", () => {
    expect(getRule("border-inline-color: var(--c);").rule).toStrictEqual([
      {
        s: [1, 1],
        d: [
          [[{}, "var", "c", 1], "borderStartColor", 1],
          [[{}, "var", "c", 1], "borderEndColor", 1],
        ],
        dv: 1,
      },
    ]);
  });

  test("border-inline-color with a var() fallback", () => {
    expect(getRule("border-inline-color: var(--c, red);").rule).toStrictEqual([
      {
        s: [1, 1],
        d: [
          [[{}, "var", ["c", "red"], 1], "borderStartColor", 1],
          [[{}, "var", ["c", "red"], 1], "borderEndColor", 1],
        ],
        dv: 1,
      },
    ]);
  });

  test("border-inline-width with a var() fallback", () => {
    expect(getRule("border-inline-width: var(--w, 3px);").rule).toStrictEqual([
      {
        s: [1, 1],
        d: [
          [[{}, "var", ["w", 3], 1], "borderStartWidth", 1],
          [[{}, "var", ["w", 3], 1], "borderEndWidth", 1],
        ],
        dv: 1,
      },
    ]);
  });

  test("border-inline-width with calc() over a var()", () => {
    const calc = [{}, "calc", [[{}, "var", "w", 1], "*", 2]];

    expect(
      getRule("border-inline-width: calc(var(--w) * 2);").rule,
    ).toStrictEqual([
      {
        s: [1, 1],
        d: [
          [calc, "borderStartWidth", 1],
          [calc, "borderEndWidth", 1],
        ],
        dv: 1,
      },
    ]);
  });
});

describe("logical border shorthands with two values (unparsed path)", () => {
  // The grammar is `<value>{1,2}` — the second component is the END edge. The
  // parsed path splits it that way, so the unparsed path must too.
  test("border-inline-width: var() var()", () => {
    expect(
      getRule("border-inline-width: var(--a) var(--b);").rule,
    ).toStrictEqual([
      {
        s: [1, 1],
        d: [
          [[{}, "var", "a", 1], "borderStartWidth", 1],
          [[{}, "var", "b", 1], "borderEndWidth", 1],
        ],
        dv: 1,
      },
    ]);
  });

  test("border-inline-color: var() var()", () => {
    expect(
      getRule("border-inline-color: var(--a) var(--b);").rule,
    ).toStrictEqual([
      {
        s: [1, 1],
        d: [
          [[{}, "var", "a", 1], "borderStartColor", 1],
          [[{}, "var", "b", 1], "borderEndColor", 1],
        ],
        dv: 1,
      },
    ]);
  });

  test("more than two values is not the grammar, so the declaration drops", () => {
    const { rule, warnings } = getRule(
      "border-inline-width: var(--a) var(--b) var(--c);",
    );

    expect(rule).toBeUndefined();
    expect(warnings).toStrictEqual({
      values: { "border-inline-width": ["3 values (expected 1 or 2)"] },
    });
  });
});

describe("logical border three-part shorthands via var() (unparsed path)", () => {
  // border-inline / -start / -end each pack width, style and colour into one
  // value that stays opaque until the variable resolves, exactly as `border`
  // does. They compile to the same runtime-call shape, and the native resolver
  // fans the resolved list out across the inline edges.
  test.each([
    ["border-inline", "borderInline"],
    ["border-inline-start", "borderInlineStart"],
    ["border-inline-end", "borderInlineEnd"],
  ])("%s with a var() compiles to a runtime call", (property, resolver) => {
    const { rule, warnings } = getRule(`${property}: var(--b);`);

    expect(rule).toStrictEqual([
      {
        s: [1, 1],
        d: [[[{}, resolver, [{}, "var", "b", 1], 1], resolver, 1]],
        dv: 1,
      },
    ]);
    expect(warnings).toStrictEqual({});
  });

  // The same shape `border` compiles to, which is what makes one runtime
  // handler serve both.
  test("the runtime-call shape matches the one `border` compiles to", () => {
    const inline = getRule("border-inline: var(--b);").rule;
    const uniform = getRule("border: var(--b);").rule;

    expect(inline).toStrictEqual([
      {
        s: [1, 1],
        d: [[[{}, "borderInline", [{}, "var", "b", 1], 1], "borderInline", 1]],
        dv: 1,
      },
    ]);
    expect(uniform).toStrictEqual([
      {
        s: [1, 1],
        d: [[[{}, "border", [{}, "var", "b", 1], 1], "border", 1]],
        dv: 1,
      },
    ]);
  });

  test.each(["border-inline", "border-inline-start", "border-inline-end"])(
    "%s without a var() still expands at compile time",
    (property) => {
      expect(getRule(`${property}: 2px solid red;`).warnings).toStrictEqual({});
    },
  );
});

/**
 * The block axis, which React Native supports differently from the inline one.
 *
 * The three block COLOURS are real props — `borderBlockColor`,
 * `borderBlockStartColor` and `borderBlockEndColor` are in
 * `ReactNativeStyleAttributes`, in both `BaseViewConfig`s and in `ViewStyle` —
 * so they are emitted as-is. The block WIDTHS appear only in
 * `BaseViewConfig.ios.js`, so emitting them paints on iOS and nowhere else;
 * they map to the physical edges instead. `direction` never flips the block
 * axis, so block-start is the top edge on every platform.
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
    ["border-block-color", "borderBlockColor"],
  ])("%s keeps React Native's own prop", (property, key) => {
    expect(getRule(`${property}: red;`).rule).toStrictEqual([
      { s: [1, 1], d: [{ [key]: "#f00" }] },
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
            borderBlockColor: "#f00",
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
    ["border-block-width", "borderTopWidth", "borderBottomWidth"],
    ["border-block-color", "borderBlockStartColor", "borderBlockEndColor"],
  ])("%s expands to both edges", (property, startKey, endKey) => {
    expect(getRule(`${property}: var(--v);`).rule).toStrictEqual([
      {
        s: [1, 1],
        d: [
          [[{}, "var", "v", 1], startKey, 1],
          [[{}, "var", "v", 1], endKey, 1],
        ],
        dv: 1,
      },
    ]);
  });

  test.each([
    ["border-block-width", "borderTopWidth", "borderBottomWidth"],
    ["border-block-color", "borderBlockStartColor", "borderBlockEndColor"],
  ])("%s: var() var() feeds one edge each", (property, startKey, endKey) => {
    expect(getRule(`${property}: var(--a) var(--b);`).rule).toStrictEqual([
      {
        s: [1, 1],
        d: [
          [[{}, "var", "a", 1], startKey, 1],
          [[{}, "var", "b", 1], endKey, 1],
        ],
        dv: 1,
      },
    ]);
  });

  test("more than two values is not the grammar, so the declaration drops", () => {
    const { rule, warnings } = getRule(
      "border-block-width: var(--a) var(--b) var(--c);",
    );

    expect(rule).toBeUndefined();
    expect(warnings).toStrictEqual({
      values: { "border-block-width": ["3 values (expected 1 or 2)"] },
    });
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

  // The same runtime-call shape the inline axis and `border` compile to, which
  // is what lets one handler grammar serve all seven.
  test.each([
    ["border-block", "borderBlock"],
    ["border-block-start", "borderBlockStart"],
    ["border-block-end", "borderBlockEnd"],
  ])("%s with a var() compiles to a runtime call", (property, resolver) => {
    const { rule, warnings } = getRule(`${property}: var(--b);`);

    expect(rule).toStrictEqual([
      {
        s: [1, 1],
        d: [[[{}, resolver, [{}, "var", "b", 1], 1], resolver, 1]],
        dv: 1,
      },
    ]);
    expect(warnings).toStrictEqual({});
  });
});
