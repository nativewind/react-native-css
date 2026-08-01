import { applyValue } from "../../native/objects";

/**
 * `font-family` reaches React Native as ONE family, whichever route it took.
 *
 * The parsed path already narrows a stack to its first family and warns about
 * the rest. A value arriving through a `var()` never reaches that parser — the
 * declaration compiles unparsed and the variable is read at render — so the
 * narrowing has to exist on the runtime side too, in the one place the property
 * name and the resolved value are both in hand.
 *
 * Without it the runtime hands Fabric an array where `TextStyle.fontFamily` is
 * a `string`, and the declaration is refused outright: the element renders in
 * the platform default rather than in the family the stylesheet asked for. That
 * is the shape a bundled typeface disappears in, and `font-family:
 * var(--font-sans)` is how Tailwind's own default theme spells it.
 */

/** A real Tailwind `--font-sans`, which is why the stack is the common case. */
const FONT_SANS_STACK = [
  "Inter",
  "Inter Fallback",
  "ui-sans-serif",
  "system-ui",
  "sans-serif",
] as const;

test("a resolved font stack reduces to its first family, as a string", () => {
  const target: Record<string, unknown> = {};
  applyValue(target, "fontFamily", [...FONT_SANS_STACK]);

  expect(target.fontFamily).toBe("Inter");
  // The type matters as much as the value: React Native's `fontFamily` is a
  // `string`, and an array is what Fabric refuses.
  expect(typeof target.fontFamily).toBe("string");
});

test("a singly wrapped stack is unwrapped too", () => {
  // A resolved variable can arrive as the list inside a list, which is why the
  // reduction loops rather than taking `[0]` once.
  const target: Record<string, unknown> = {};
  applyValue(target, "fontFamily", [[...FONT_SANS_STACK]]);

  expect(target.fontFamily).toBe("Inter");
});

test("a single family passes through untouched", () => {
  const target: Record<string, unknown> = {};
  applyValue(target, "fontFamily", "fisona-icons");

  expect(target.fontFamily).toBe("fisona-icons");
});

test("the reduction is scoped to fontFamily", () => {
  // `fontVariant` is legitimately a list on React Native, so reducing every
  // array-valued property would trade one silent failure for another.
  const target: Record<string, unknown> = {};
  applyValue(target, "fontVariant", ["small-caps"]);

  expect(target.fontVariant).toStrictEqual(["small-caps"]);
});

test("both sentinel meanings survive the reduction", () => {
  // The reduction sits before the final assignment, so it must not disturb what
  // `applyValue` already means: `undefined` is "set nothing", and the null
  // literal is "clear this value", which React Native spells as `undefined`.
  const untouched: Record<string, unknown> = {};
  applyValue(untouched, "fontFamily", undefined);
  expect("fontFamily" in untouched).toBe(false);

  const cleared: Record<string, unknown> = { fontFamily: "Inter" };
  applyValue(cleared, "fontFamily", null);
  expect(cleared.fontFamily).toBeUndefined();
});
