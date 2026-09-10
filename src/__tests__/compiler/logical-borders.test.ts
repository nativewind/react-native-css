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
  test("border-block", () => {
    expect(getRule("border-block: 2px solid red;").rule).toStrictEqual([
      {
        s: [1, 1],
        d: [
          { borderBlockColor: "#f00", borderTopWidth: 2, borderBottomWidth: 2 },
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
      { s: [1, 1], d: [{ borderBlockEndColor: "#f00", borderBottomWidth: 2 }] },
    ]);
  });

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
  test.each([
    "border-block-style",
    "border-block-start-style",
    "border-block-end-style",
  ])(
    "%s solid uses the native default without emitting an unsupported prop",
    (property) => {
      const { rule, warnings } = getRule(`${property}: solid;`);
      expect(rule).toBeUndefined();
      expect(warnings).toEqual({});
    },
  );

  test("a dashed block style reports the unsupported side styles", () => {
    const { rule, warnings } = getRule("border-block-style: dashed;");
    expect(rule).toBeUndefined();
    expect(warnings).toEqual({
      values: {
        "border-block-start-style": ["dashed"],
        "border-block-end-style": ["dashed"],
      },
    });
  });
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
