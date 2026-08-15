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

describe("logical border shorthands React Native cannot express", () => {
  // border-inline / -start / -end pack width, style and colour into one
  // runtime value, and no style resolver fans one slot out to a per-edge pair.
  test.each(["border-inline", "border-inline-start", "border-inline-end"])(
    "%s with a var() warns and drops",
    (property) => {
      const { rule, warnings } = getRule(`${property}: var(--b);`);

      expect(rule).toBeUndefined();
      expect(warnings).toStrictEqual({ properties: [property] });
    },
  );

  test.each(["border-inline", "border-inline-start", "border-inline-end"])(
    "%s without a var() still expands",
    (property) => {
      expect(getRule(`${property}: 2px solid red;`).warnings).toStrictEqual({});
    },
  );
});
