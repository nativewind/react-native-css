import { applyValue } from "../../native/objects";

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
    expect(typeof target.fontFamily).toBe("string");
  });

  test("a nested stack is flattened, not descended into", () => {
    expect(applyFontFamily([[...FONT_SANS_STACK]]).fontFamily).toBe("Inter");
    expect(applyFontFamily([[], "Arial"]).fontFamily).toBe("Arial");
    expect(applyFontFamily([[[]], "Arial"]).fontFamily).toBe("Arial");
    expect(applyFontFamily([["Inter"], "Arial"]).fontFamily).toBe("Inter");
  });

  test("an entry that cannot name a family is skipped", () => {
    expect(applyFontFamily([12, "Inter"]).fontFamily).toBe("Inter");
    expect(applyFontFamily([null, "Arial"]).fontFamily).toBe("Arial");
    expect(applyFontFamily([undefined, "Arial"]).fontFamily).toBe("Arial");
    expect(applyFontFamily([true, "Arial"]).fontFamily).toBe("Arial");
  });

  test("a single family passes through untouched", () => {
    expect(applyFontFamily("brand-icons").fontFamily).toBe("brand-icons");
  });

  test("a stack with nothing usable sets nothing", () => {
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
    // fontVariant is a list on React Native, so only fontFamily is reduced
    const target: Record<string, unknown> = {};
    applyValue(target, "fontVariant", ["small-caps"]);

    expect(target.fontVariant).toStrictEqual(["small-caps"]);
  });

  test("both sentinel meanings survive the reduction", () => {
    const untouched: Record<string, unknown> = {};
    applyValue(untouched, "fontFamily", undefined);
    expect("fontFamily" in untouched).toBe(false);

    const cleared: Record<string, unknown> = { fontFamily: "Inter" };
    applyValue(cleared, "fontFamily", null);
    expect("fontFamily" in cleared).toBe(true);
    expect(cleared.fontFamily).toBeUndefined();
  });

  test("the delayed-style marker passes through by identity", () => {
    // applyDeclarations parks { fontFamily: true } on the target while a delayed value resolves
    const marker = { fontFamily: true };
    const target: Record<string, unknown> = {};
    applyValue(target, "fontFamily", marker);

    expect(target.fontFamily).toBe(marker);
  });
});
