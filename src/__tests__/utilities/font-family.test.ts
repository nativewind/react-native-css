import { narrowFontFamily } from "react-native-css/utilities";

/**
 * The one reduction both planes read. The compiler applies it to what it can
 * see and the runtime applies it again to what only exists at render, so the
 * three outcomes have to be stated where both can find them.
 */
describe("narrowFontFamily", () => {
  test("a family is itself", () => {
    expect(narrowFontFamily("Inter")).toStrictEqual({
      kind: "family",
      family: "Inter",
    });
  });

  test("a stack reduces to its first family", () => {
    expect(
      narrowFontFamily(["Inter", "Helvetica", "sans-serif"]),
    ).toStrictEqual({ kind: "family", family: "Inter" });
  });

  test("a nested group is read in place, not descended into", () => {
    expect(narrowFontFamily([[], "Arial"])).toStrictEqual({
      kind: "family",
      family: "Arial",
    });
    expect(narrowFontFamily([[[]], "Arial"])).toStrictEqual({
      kind: "family",
      family: "Arial",
    });
    expect(narrowFontFamily([["Inter"], "Arial"])).toStrictEqual({
      kind: "family",
      family: "Inter",
    });
  });

  test("an entry that cannot name a family is skipped", () => {
    // Not `{}`: an empty object in front of a string IS a style function, and
    // the case below says so.
    for (const unusable of [12, null, undefined, true]) {
      expect(narrowFontFamily([unusable, "Arial"])).toStrictEqual({
        kind: "family",
        family: "Arial",
      });
    }
  });

  test("nothing usable is `none`", () => {
    expect(narrowFontFamily([])).toStrictEqual({ kind: "none" });
    expect(narrowFontFamily([12, null])).toStrictEqual({ kind: "none" });
    expect(narrowFontFamily(undefined)).toStrictEqual({ kind: "none" });
    expect(narrowFontFamily(42)).toStrictEqual({ kind: "none" });
  });

  test("a variable reference is `deferred`, at any depth of the stack", () => {
    // The compiler stops here and emits the descriptor whole; the runtime runs
    // the reduction again once the variable has a value.
    expect(narrowFontFamily([{}, "var", "font-sans", 1])).toStrictEqual({
      kind: "deferred",
    });
    expect(
      narrowFontFamily([[{}, "var", "font-sans", 1], "Helvetica"]),
    ).toStrictEqual({ kind: "deferred" });
  });

  test("a family in front of a variable reference wins", () => {
    // React Native only reaches the first entry, so the variable can never be
    // used and the answer does not depend on it.
    expect(narrowFontFamily(["Inter", [{}, "var", "x", 1]])).toStrictEqual({
      kind: "family",
      family: "Inter",
    });
  });

  test("an array is a comma-separated stack, never one multi-word name", () => {
    // The rule that decides the known limit. The compiler stores
    // `--f: Helvetica Neue` and `--f: Inter, Helvetica` as the same array
    // (`compiler/font-family.test.ts` pins that), so the reduction has to pick
    // one reading and a stack is the one every other case needs. Quoting the
    // name keeps it a string, which is the shape that survives.
    expect(narrowFontFamily(["Helvetica", "Neue"])).toStrictEqual({
      kind: "family",
      family: "Helvetica",
    });
    expect(narrowFontFamily("Helvetica Neue")).toStrictEqual({
      kind: "family",
      family: "Helvetica Neue",
    });
  });

  test("the reduction is idempotent", () => {
    const once = narrowFontFamily(["Inter", "Helvetica"]);
    expect(once.kind).toBe("family");
    expect(
      narrowFontFamily(once.kind === "family" ? once.family : undefined),
    ).toStrictEqual(once);
  });
});
