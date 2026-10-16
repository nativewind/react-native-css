import {
  isReservedFamilyIdent,
  narrowFontFamily,
} from "react-native-css/utilities";

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
    expect(narrowFontFamily([["Inter"], "Arial"])).toStrictEqual({
      kind: "family",
      family: "Inter",
    });
  });

  // Chromium 153, Firefox 155 and WebKit 26.6 ignore a stack with an entry that names no family
  test("an entry that cannot name a family invalidates the stack", () => {
    for (const unusable of [12, null, undefined, true, [], [[]]]) {
      expect(narrowFontFamily([unusable, "Arial"])).toStrictEqual({
        kind: "none",
      });
      expect(narrowFontFamily(["Arial", unusable])).toStrictEqual({
        kind: "none",
      });
    }
  });

  test("a function other than var() names no family", () => {
    expect(narrowFontFamily([[{}, "calc", [1]], "Inter"])).toStrictEqual({
      kind: "none",
    });
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

  test("a variable reference behind a family still waits, because its value can invalidate the stack", () => {
    expect(narrowFontFamily(["Inter", [{}, "var", "x", 1]])).toStrictEqual({
      kind: "deferred",
    });
  });

  test("an entry that names no family invalidates a stack that also waits", () => {
    expect(narrowFontFamily([[{}, "var", "x", 1], 12])).toStrictEqual({
      kind: "none",
    });
  });

  test("a reserved ident is never a family name", () => {
    for (const reserved of [
      "inherit",
      "initial",
      "unset",
      "revert",
      "revert-layer",
      "default",
      "INHERIT",
    ]) {
      expect(isReservedFamilyIdent(reserved)).toBe(true);
    }
    expect(isReservedFamilyIdent("Inter")).toBe(false);
    expect(isReservedFamilyIdent("serif")).toBe(false);
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
