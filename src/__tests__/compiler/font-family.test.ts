import { compile } from "react-native-css/compiler";

/**
 * React Native's `fontFamily` is one family name, never a stack, so every
 * compiler path that produces `font-family` has to reduce a stack to a single
 * usable family. There are three of them — the typed parser, the `font`
 * shorthand, and the unparsed path a declaration falls to when LightningCSS
 * cannot type it — and only the value a `var()` supplies is left for the
 * runtime, because it does not exist until render.
 *
 * This plane can only say which descriptor was emitted. Which family React
 * Native is handed is `src/__tests__/native/font-family.test.tsx`, and for a
 * `var()` that is the only plane that can answer it.
 */

const declarationsFor = (css: string, className: string) => {
  const rules = new Map(compile(css).stylesheet().s ?? []).get(className);

  return (rules ?? []).flatMap((rule) => rule.d ?? []);
};

const variablesFor = (css: string, className: string) => {
  const rules = new Map(compile(css).stylesheet().s ?? []).get(className);

  return (rules ?? []).flatMap((rule) => rule.v ?? []);
};

describe("the typed path", () => {
  // CONTROL. LightningCSS types these, and `parseFontFamily` already took
  // `value[0]` before this change — every case in this block passes on `main`.
  //
  // Measured: putting `return stack[0]` back inside `firstFontFamily` reddens
  // nothing here or anywhere else, because a typed `value.family` is a list of
  // family names and its first entry is always usable. So this block guards a
  // refactor that no input can distinguish, and says so rather than implying it
  // caught something. What it does catch is the typed path drifting away from
  // the shared reduction the other two producers read.

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
    // Quotes are how CSS spells a family name containing a space or a comma,
    // and LightningCSS hands back the unquoted string. A multi-ident name is
    // joined for the same reason: it is one family, not two.
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
    // CONTROL, and the reason there is nothing to warn about: React Native can
    // only use one, so the rest are not a mistake the author can correct.
    // `warnings()` stays empty for every stack spelling.
    expect(
      compile(`.a { font-family: Inter, Helvetica, sans-serif; }`).warnings(),
    ).toStrictEqual({});
    expect(
      compile(`.a { font-family: Inter, Helvetica,; }`).warnings(),
    ).toStrictEqual({});
  });
});

describe("the unparsed path", () => {
  // LightningCSS cannot type any of these, so they reach `parseUnparsed` and
  // come out of the compiler as a static value rather than a typed one. Each
  // spelling is plain CSS: no casts, no runtime shape, and no `var()`.
  test.each([
    ["a trailing comma", `.a { font-family: Inter, Helvetica,; }`],
    ["a leading comma", `.a { font-family: ,Inter, Helvetica; }`],
    ["a doubled comma", `.a { font-family: Inter,,Helvetica; }`],
    ["quoted families", `.a { font-family: "Inter", "Helvetica",; }`],
  ])("%s still narrows to the first family", (_name, css) => {
    expect(declarationsFor(css, "a")).toStrictEqual([{ fontFamily: "Inter" }]);
  });

  test("a quoted name keeps its spaces and its commas", () => {
    // The twin of the typed-path case above: the two paths have to agree on
    // what one family is, or the same stylesheet renders differently depending
    // on whether LightningCSS could type the declaration.
    expect(
      declarationsFor(`.a { font-family: "Helvetica Neue", Arial,; }`, "a"),
    ).toStrictEqual([{ fontFamily: "Helvetica Neue" }]);
    expect(
      declarationsFor(`.a { font-family: "Foo, Bar", Arial,; }`, "a"),
    ).toStrictEqual([{ fontFamily: "Foo, Bar" }]);
  });

  test("an entry that cannot name a family is skipped", () => {
    // A browser skips a family it cannot use and moves to the next one. `12` is
    // not a family name, so `Inter` is the first that is.
    expect(
      declarationsFor(`.a { font-family: 12, Inter; }`, "a"),
    ).toStrictEqual([{ fontFamily: "Inter" }]);
  });

  test("a stack with nothing usable emits no declaration at all", () => {
    // Not `fontFamily: []`, and not `fontFamily: undefined` either: the
    // declaration is dropped, so a family set by a lower-specificity rule
    // survives the way the cascade says it should.
    expect(declarationsFor(`.a { font-family: ,; }`, "a")).toStrictEqual([]);
  });

  test("a keyframe narrows too", () => {
    expect(
      compile(
        `@keyframes k { from { font-family: Inter, Helvetica,; } to { font-family: Georgia; } }`,
      ).stylesheet().k,
    ).toStrictEqual([
      [
        "k",
        [
          ["from", [{ fontFamily: "Inter" }]],
          ["to", [{ fontFamily: "Georgia" }]],
        ],
      ],
    ]);
  });
});

describe("the var() path", () => {
  // `--stack` is declared twice in each of these: a single-definition variable
  // is inlined by the compiler and would be narrowed above after all.

  test("a stack the compiler cannot see is left for the runtime", () => {
    // CONTROL. This is the premise the runtime reduction rests on rather than a
    // consequence of it, so it passes on `main`. If the compiler ever starts
    // narrowing here, the runtime half stops being reachable and this goes red
    // to say so.
    expect(
      declarationsFor(
        `:root { --stack: Inter, Helvetica; } .other { --stack: Georgia, serif; } .a { font-family: var(--stack); }`,
        "a",
      ),
    ).toStrictEqual([[[{}, "var", "stack", 1], "fontFamily", 1]]);
  });

  test("a var() behind a literal is narrowed away", () => {
    // This is what separates narrowing from "the compiler emits a var
    // reference": the first family is known, so the var can never be used and
    // the declaration stops being reactive.
    expect(
      declarationsFor(
        `:root { --x: Georgia; } .other { --x: Verdana; } .a { font-family: Inter, var(--x); }`,
        "a",
      ),
    ).toStrictEqual([{ fontFamily: "Inter" }]);
  });

  test("a var() in front of a literal is left whole", () => {
    // CONTROL, and the reason the compiler cannot simply take the first entry:
    // whether `Helvetica` is reached depends on what `--x` holds.
    expect(
      declarationsFor(
        `:root { --x: Georgia; } .other { --x: Verdana; } .a { font-family: var(--x), Helvetica; }`,
        "a",
      ),
    ).toStrictEqual([[[[{}, "var", "x", 1], "Helvetica"], "fontFamily"]]);
  });

  test("a fallback is emitted whole, whatever shape it has", () => {
    // CONTROL — passes on `main`, and that is what it is for: it says the
    // compiler plane cannot answer any of these, so the family each one lands
    // on has to be measured at render.
    //
    // A fallback lives inside the `var()`, so the compiler cannot narrow it
    // either — it does not know yet whether the variable has a value. Each of
    // these is one deferred descriptor, and which family lands is decided at
    // render: `src/__tests__/native/font-family.test.tsx` has the answers.
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
    // CONTROL — passes on `main`. It measures what the compiler stores, which
    // this change does not touch, and that measurement is the reason the limit
    // is a limit rather than a bug in the reduction.
    //
    // The measurement behind the known limit in
    // `src/__tests__/native/font-family.test.tsx`. `reduceParseUnparsed` groups
    // an unparsed value by comma and nests a multi-token group, and for
    // `font-family` a single-entry stack of two idents and a two-entry stack of
    // one ident each collapse onto the identical array.
    //
    // No reduction downstream can separate them, so `--f: Helvetica Neue`
    // renders as `Helvetica`. Quoting the name keeps it a single string, which
    // is CSS's own answer for a family name that is not one ident.
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
