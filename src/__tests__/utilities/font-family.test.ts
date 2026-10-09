import { narrowFontFamily } from "react-native-css/utilities";

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
    expect(narrowFontFamily([{}, "var", "font-sans", 1])).toStrictEqual({
      kind: "deferred",
    });
    expect(
      narrowFontFamily([[{}, "var", "font-sans", 1], "Helvetica"]),
    ).toStrictEqual({ kind: "deferred" });
  });

  test("a family in front of a variable reference wins", () => {
    expect(narrowFontFamily(["Inter", [{}, "var", "x", 1]])).toStrictEqual({
      kind: "family",
      family: "Inter",
    });
  });

  test("an array is a comma-separated stack, never one multi-word name", () => {
    // The compiler stores an ident group and a comma stack as the same array, so the reduction reads both as a stack
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
