import { compile } from "react-native-css/compiler";

/**
 * React Native's `fontFamily` is one family name, never a stack, so every
 * compiler path that produces `font-family` has to reduce a stack to a single
 * usable family. There are three of them — the typed parser, the `font`
 * shorthand, and the unparsed path a declaration falls to when LightningCSS
 * cannot type it — and only the value a `var()` supplies is left for the
 * runtime, because it does not exist until render.
 */

const declarationsFor = (css: string, className: string) => {
  const rules = new Map(compile(css).stylesheet().s ?? []).get(className);

  return (rules ?? []).flatMap((rule) => rule.d ?? []);
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

  test("no warning is emitted for the families that are dropped", () => {
    // React Native can only use one, so the rest are not a mistake the author
    // can correct. `warnings()` stays empty for every stack spelling.
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
    // The opposite case, and the reason the compiler cannot simply take the
    // first entry: whether `Helvetica` is reached depends on what `--x` holds.
    expect(
      declarationsFor(
        `:root { --x: Georgia; } .other { --x: Verdana; } .a { font-family: var(--x), Helvetica; }`,
        "a",
      ),
    ).toStrictEqual([[[[{}, "var", "x", 1], "Helvetica"], "fontFamily"]]);
  });
});
