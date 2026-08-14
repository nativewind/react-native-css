import { applyValue } from "../../native/objects";

/**
 * `font-family` reaches React Native as ONE family, whichever route it took.
 *
 * Every compiler path narrows the stacks it can see. What it cannot see is the
 * value behind a `var()`, which only exists at render — so the same reduction
 * runs again here, where the property name and the resolved value are both in
 * hand for the first time on that path.
 *
 * `src/__tests__/native/font-family.test.tsx` drives the same reduction through
 * a real render; these cases reach `applyValue` directly so each rule of the
 * reduction can be stated on its own.
 */

/** A real Tailwind `--font-sans`, which is why the stack is the common case. */
const FONT_SANS_STACK = [
  "Inter",
  "Inter Fallback",
  "ui-sans-serif",
  "system-ui",
  "sans-serif",
] as const;

const applyFontFamily = (value: unknown): Record<string, unknown> => {
  const target: Record<string, unknown> = {};
  applyValue(target, "fontFamily", value);
  return target;
};

describe("the reduction", () => {
  test("a resolved stack reduces to its first family, as a string", () => {
    const target = applyFontFamily([...FONT_SANS_STACK]);

    expect(target.fontFamily).toBe("Inter");
    // The type matters as much as the value: React Native's `fontFamily` is a
    // `string`, and an array is what Fabric refuses.
    expect(typeof target.fontFamily).toBe("string");
  });

  test("a nested stack is flattened, not descended into", () => {
    // Descending into the first entry and staying there loses every sibling
    // behind an empty group. Flattening reaches them.
    expect(applyFontFamily([[...FONT_SANS_STACK]]).fontFamily).toBe("Inter");
    expect(applyFontFamily([[], "Arial"]).fontFamily).toBe("Arial");
    expect(applyFontFamily([[[]], "Arial"]).fontFamily).toBe("Arial");
    expect(applyFontFamily([["Inter"], "Arial"]).fontFamily).toBe("Inter");
  });

  test("an entry that cannot name a family is skipped", () => {
    // A browser skips a family it cannot use and moves to the next. Assigning
    // one is worse than skipping it: `fontFamily` is typed `string`, so a
    // number or a null reaches Fabric as a value it has no rule for.
    expect(applyFontFamily([12, "Inter"]).fontFamily).toBe("Inter");
    expect(applyFontFamily([null, "Arial"]).fontFamily).toBe("Arial");
    expect(applyFontFamily([undefined, "Arial"]).fontFamily).toBe("Arial");
    expect(applyFontFamily([true, "Arial"]).fontFamily).toBe("Arial");
  });

  test("a single family passes through untouched", () => {
    expect(applyFontFamily("fisona-icons").fontFamily).toBe("fisona-icons");
  });

  test("a stack with nothing usable sets nothing", () => {
    // `applyValue` already separates "set nothing" (leave the key absent) from
    // "clear" (set the key to `undefined`). A stack with no usable entry is a
    // declaration that failed, so it takes the first door and leaves whatever
    // an earlier rule put there standing.
    expect("fontFamily" in applyFontFamily([])).toBe(false);
    expect("fontFamily" in applyFontFamily([12])).toBe(false);
    expect("fontFamily" in applyFontFamily([[], [null]])).toBe(false);

    const inherited: Record<string, unknown> = { fontFamily: "Inter" };
    applyValue(inherited, "fontFamily", []);
    expect(inherited.fontFamily).toBe("Inter");
  });
});

describe("what the reduction must not disturb", () => {
  test("the reduction is scoped to fontFamily", () => {
    // `fontVariant` is legitimately a list on React Native, so reducing every
    // array-valued property would trade one silent failure for another.
    const target: Record<string, unknown> = {};
    applyValue(target, "fontVariant", ["small-caps"]);

    expect(target.fontVariant).toStrictEqual(["small-caps"]);
  });

  test("both sentinel meanings survive the reduction", () => {
    // `undefined` is "set nothing", and the null literal is "clear this value",
    // which React Native spells as `undefined`.
    const untouched: Record<string, unknown> = {};
    applyValue(untouched, "fontFamily", undefined);
    expect("fontFamily" in untouched).toBe(false);

    const cleared: Record<string, unknown> = { fontFamily: "Inter" };
    applyValue(cleared, "fontFamily", null);
    expect("fontFamily" in cleared).toBe(true);
    expect(cleared.fontFamily).toBeUndefined();
  });

  test("the delayed-style marker passes through by identity", () => {
    // `applyDeclarations` parks `{ fontFamily: true }` on the target while a
    // delayed value resolves and reclaims it by identity. Reducing it away
    // would strand every `var()`-valued font-family, unresolved forever.
    const marker = { fontFamily: true };
    const target: Record<string, unknown> = {};
    applyValue(target, "fontFamily", marker);

    expect(target.fontFamily).toBe(marker);
  });
});
