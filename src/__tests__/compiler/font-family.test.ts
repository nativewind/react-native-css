import { compile } from "react-native-css/compiler";

const declarationsFor = (css: string, className: string) => {
  const rules = new Map(compile(css).stylesheet().s ?? []).get(className);

  return (rules ?? []).flatMap((rule) => rule.d ?? []);
};

const variablesFor = (css: string, className: string) => {
  const rules = new Map(compile(css).stylesheet().s ?? []).get(className);

  return (rules ?? []).flatMap((rule) => rule.v ?? []);
};

describe("the typed path", () => {
  test("a literal stack narrows to its first family", () => {
    expect(
      declarationsFor(`.a { font-family: Inter, Helvetica, sans-serif; }`, "a"),
    ).toStrictEqual([{ fontFamily: "Inter" }]);
  });

  test("the `font` shorthand narrows to its first family", () => {
    expect(
      declarationsFor(`.a { font: italic 12px Inter, Helvetica; }`, "a"),
    ).toStrictEqual([
      {
        fontFamily: "Inter",
        fontSize: 12,
        fontStyle: "italic",
        fontWeight: "normal",
      },
    ]);
  });

  test("a name that is not a bare ident survives whole", () => {
    // LightningCSS unquotes a quoted family, and a multi-ident name is one family
    expect(
      declarationsFor(`.a { font-family: "Helvetica Neue", Arial; }`, "a"),
    ).toStrictEqual([{ fontFamily: "Helvetica Neue" }]);
    expect(
      declarationsFor(`.a { font-family: "Foo, Bar", Arial; }`, "a"),
    ).toStrictEqual([{ fontFamily: "Foo, Bar" }]);
    expect(
      declarationsFor(`.a { font-family: Helvetica Neue, Arial; }`, "a"),
    ).toStrictEqual([{ fontFamily: "Helvetica Neue" }]);
  });

  test("no warning is emitted for the families that are dropped", () => {
    expect(
      compile(`.a { font-family: Inter, Helvetica, sans-serif; }`).warnings(),
    ).toStrictEqual({});
    expect(
      compile(`.a { font-family: Inter, Helvetica,; }`).warnings(),
    ).toStrictEqual({});
  });
});

// Chromium 153, Firefox 155 and WebKit 26.6 ignore a stack with an entry that names no family
describe("the unparsed path", () => {
  test.each([
    ["a trailing comma", `.a { font-family: Inter, Helvetica,; }`],
    ["a leading comma", `.a { font-family: ,Inter, Helvetica; }`],
    ["a doubled comma", `.a { font-family: Inter,,Helvetica; }`],
    [
      "quoted families and a trailing comma",
      `.a { font-family: "Inter", "Helvetica",; }`,
    ],
    ["a number", `.a { font-family: 12, Inter; }`],
    ["a function", `.a { font-family: calc(1px), Inter; }`],
    [
      "a CSS-wide keyword",
      `:root { --x: Georgia; } .other { --x: Verdana; } .a { font-family: Inter, inherit, var(--x); }`,
    ],
    [
      "a reserved ident in any case",
      `:root { --x: Georgia; } .other { --x: Verdana; } .a { font-family: Inter, DEFAULT, var(--x); }`,
    ],
  ])("%s invalidates the stack", (_name, css) => {
    expect(declarationsFor(css, "a")).toStrictEqual([]);
  });

  test("a stack with nothing usable emits no declaration at all", () => {
    expect(declarationsFor(`.a { font-family: ,; }`, "a")).toStrictEqual([]);
  });

  test("a keyframe drops an invalid stack too", () => {
    expect(
      compile(
        `@keyframes k { from { font-family: Inter, Helvetica,; } to { font-family: Georgia; } }`,
      ).stylesheet().k,
    ).toStrictEqual([
      [
        "k",
        [
          ["from", []],
          ["to", [{ fontFamily: "Georgia" }]],
        ],
      ],
    ]);
  });
});

describe("the var() path", () => {
  // A variable declared once is inlined by the compiler, so these declare --stack twice

  test("a stack the compiler cannot see is left for the runtime", () => {
    expect(
      declarationsFor(
        `:root { --stack: Inter, Helvetica; } .other { --stack: Georgia, serif; } .a { font-family: var(--stack); }`,
        "a",
      ),
    ).toStrictEqual([[[{}, "var", "stack", 1], "fontFamily", 1]]);
  });

  test("a var() behind a literal is left whole, because its value can invalidate the stack", () => {
    expect(
      declarationsFor(
        `:root { --x: Georgia; } .other { --x: Verdana; } .a { font-family: Inter, var(--x); }`,
        "a",
      ),
    ).toStrictEqual([[["Inter", [{}, "var", "x", 1]], "fontFamily"]]);
  });

  test("a var() in front of a literal is left whole", () => {
    expect(
      declarationsFor(
        `:root { --x: Georgia; } .other { --x: Verdana; } .a { font-family: var(--x), Helvetica; }`,
        "a",
      ),
    ).toStrictEqual([[[[{}, "var", "x", 1], "Helvetica"], "fontFamily"]]);
  });

  test("a fallback is emitted whole, whatever shape it has", () => {
    expect(
      declarationsFor(`.a { font-family: var(--missing, Helvetica); }`, "a"),
    ).toStrictEqual([
      [[{}, "var", ["missing", "Helvetica"], 1], "fontFamily", 1],
    ]);

    expect(
      declarationsFor(
        `.a { font-family: var(--missing, Inter, Helvetica); }`,
        "a",
      ),
    ).toStrictEqual([
      [[{}, "var", ["missing", ["Inter", "Helvetica"]], 1], "fontFamily", 1],
    ]);

    expect(
      declarationsFor(
        `.a { font-family: var(--missing-a, var(--missing-b, serif)); }`,
        "a",
      ),
    ).toStrictEqual([
      [
        [{}, "var", ["missing-a", [{}, "var", ["missing-b", "serif"], 1]], 1],
        "fontFamily",
        1,
      ],
    ]);
  });
});

describe("what a var() cannot carry", () => {
  test("KNOWN LIMIT: a space group and a comma group compile to the same value", () => {
    const spaceGroup = variablesFor(
      `.b { --f: Helvetica Neue; } .c { --f: x; }`,
      "b",
    );
    const commaGroup = variablesFor(
      `.b { --f: Inter, Helvetica; } .c { --f: x; }`,
      "b",
    );

    expect(spaceGroup).toStrictEqual([["f", ["Helvetica", "Neue"]]]);
    expect(commaGroup).toStrictEqual([["f", ["Inter", "Helvetica"]]]);
    expect(spaceGroup.map(([, value]) => typeof value)).toStrictEqual(
      commaGroup.map(([, value]) => typeof value),
    );

    expect(
      variablesFor(`.b { --f: "Helvetica Neue"; } .c { --f: x; }`, "b"),
    ).toStrictEqual([["f", "Helvetica Neue"]]);
  });
});
