import type {
  ReactNativeCssStyleSheet,
  StyleRule,
} from "react-native-css/compiler";
import { compile } from "react-native-css/compiler";

/**
 * Folding a single-definition custom property into its use sites asserts that
 * every element the consuming rule matches holds that value. These tests pin
 * where that assertion is provable and where it is not.
 *
 * Compiler plane. `../native/variable-inlining.test.tsx` renders the same
 * stylesheets, because a fold is a compiler decision whose only observable is
 * what the runtime paints.
 */

function rulesFor(
  sheet: ReactNativeCssStyleSheet,
  className: string,
): StyleRule[] {
  return sheet.s?.find(([name]) => name === className)?.[1] ?? [];
}

/** The value folded into `property`, or undefined if nothing was folded. */
function foldedValue(
  sheet: ReactNativeCssStyleSheet,
  className: string,
  property: string,
) {
  for (const rule of rulesFor(sheet, className)) {
    for (const declaration of rule.d ?? []) {
      if (!Array.isArray(declaration) && property in declaration) {
        return declaration[property];
      }
    }
  }
  return undefined;
}

/** Whether the class resolves at least one `var()` at runtime. */
function readsAtRuntime(sheet: ReactNativeCssStyleSheet, className: string) {
  return rulesFor(sheet, className).some((rule) => rule.dv === 1);
}

/** The value the class declares for `--<name>`, or undefined if it declares none. */
function declaredValue(
  sheet: ReactNativeCssStyleSheet,
  className: string,
  name: string,
) {
  for (const rule of rulesFor(sheet, className)) {
    for (const [declared, value] of rule.v ?? []) {
      if (declared === name) return value;
    }
  }
  return undefined;
}

describe("a variable is folded only where its value is provable", () => {
  test("a class-scoped variable does not reach another rule", () => {
    const sheet = compile(
      `.parent { --x: 10px; } .child { width: var(--x); }`,
    ).stylesheet();

    // An element carrying only `.child` never matched `.parent`, so it has no
    // `--x` and `width: 10` would be an invention.
    expect(foldedValue(sheet, "child", "width")).toBeUndefined();
    expect(readsAtRuntime(sheet, "child")).toBe(true);
    // ...and the declaration has to survive for the runtime to find it.
    expect(declaredValue(sheet, "parent", "x")).toBe(10);
  });

  test("the same block is provable, and still folds", () => {
    const sheet = compile(`.a { --x: 10px; width: var(--x); }`).stylesheet();

    expect(foldedValue(sheet, "a", "width")).toBe(10);
    expect(readsAtRuntime(sheet, "a")).toBe(false);
  });

  test("a block-scoped declaration survives its own fold", () => {
    // The fold reached this block's references and no others. A descendant
    // inherits `--x` at runtime — including one styled by a stylesheet compiled
    // separately, which this pass cannot see and must not assume away.
    const sheet = compile(`.a { --x: 10px; width: var(--x); }`).stylesheet();

    expect(declaredValue(sheet, "a", "x")).toBe(10);
  });

  test.each([":root", ":host", "*", "html"])(
    "%s is universal, so its variables fold anywhere",
    (selector) => {
      const sheet = compile(
        `${selector} { --x: 10px; } .child { width: var(--x); }`,
      ).stylesheet();

      expect(foldedValue(sheet, "child", "width")).toBe(10);
      expect(readsAtRuntime(sheet, "child")).toBe(false);
    },
  );

  test.each([
    [":root .theme", "a descendant of the root is not the root"],
    ["div", "every element descends from html, from no other element name"],
    [":hover", "a state is not a scope"],
    [".theme", "a class is the case this whole rule exists for"],
  ])("%s is not universal — %s", (selector) => {
    const sheet = compile(
      `${selector} { --x: 10px; } .child { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "child", "width")).toBeUndefined();
    expect(readsAtRuntime(sheet, "child")).toBe(true);
  });

  test.each([
    [":root", 10],
    [".theme", undefined],
  ])("a nested `&` under %s takes its parent's answer", (parent, expected) => {
    // `&` adds no constraint of its own, so the scope is whatever the rule it
    // is nested in already was.
    const sheet = compile(
      `${parent} { & { --x: 10px; } } .child { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "child", "width")).toBe(expected);
  });

  test("@layer does not narrow a universal scope", () => {
    // The shape Tailwind emits for its theme.
    const sheet = compile(
      `@layer theme { :root, :host { --x: 10px; } } .child { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "child", "width")).toBe(10);
  });
});

describe("a conditional scope is not a universal one", () => {
  test.each([
    ["@media (min-width: 1px)", "media"],
    ["@supports (display: flex)", "supports"],
    ["@container (min-width: 1px)", "container"],
  ])("%s wrapping :root", (atRule) => {
    const sheet = compile(
      `${atRule} { :root { --x: 10px; } } .child { width: var(--x); }`,
    ).stylesheet();

    // Whether the declaration applies is decided somewhere this pass cannot
    // see, so `.child` cannot be told it holds the value.
    expect(foldedValue(sheet, "child", "width")).toBeUndefined();
    expect(readsAtRuntime(sheet, "child")).toBe(true);
  });

  test("a conditional block still folds into itself", () => {
    // A query that switches the declaration off switches the reference off with
    // it, so the two cannot disagree.
    const sheet = compile(
      `@media (min-width: 1px) { .a { --x: 10px; width: var(--x); } }`,
    ).stylesheet();

    expect(foldedValue(sheet, "a", "width")).toBe(10);
  });
});

describe("a registered property is a second definition", () => {
  test("inherits: false makes a universal declaration non-universal", () => {
    // `--x` does not inherit, so an element that is not the root holds the
    // REGISTERED initial value, not the one `:root` declares.
    const sheet = compile(
      `@property --x { syntax: "<length>"; inherits: false; initial-value: 10px; }
       :root { --x: 20px; }
       .b { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "b", "width")).toBeUndefined();
    expect(readsAtRuntime(sheet, "b")).toBe(true);
  });

  test("inherits: true leaves the universal fold alone", () => {
    const sheet = compile(
      `@property --x { syntax: "<length>"; inherits: true; initial-value: 10px; }
       :root { --x: 20px; }
       .b { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "b", "width")).toBe(20);
  });
});

describe("a variable's own value is held to the same terms", () => {
  test("a nested reference does not cross a block boundary", () => {
    const sheet = compile(
      `.a { --x: var(--y); width: var(--x); } .b { --y: 10px; }`,
    ).stylesheet();

    // `--y` belongs to `.b`. Folding it into `.a`'s value carries it to every
    // element matching `.a`, none of which need ever have matched `.b` — and
    // `.a`'s own `width` is where that lands, because `--x` IS foldable there.
    expect(foldedValue(sheet, "a", "width")).toBeUndefined();
    expect(readsAtRuntime(sheet, "a")).toBe(true);
    expect(declaredValue(sheet, "a", "x")).toStrictEqual([{}, "var", "y", 1]);
  });

  test("a nested reference in the same block folds", () => {
    const sheet = compile(
      `.a { --y: 10px; --x: var(--y); width: var(--x); }`,
    ).stylesheet();

    expect(declaredValue(sheet, "a", "x")).toBe(10);
    expect(foldedValue(sheet, "a", "width")).toBe(10);
  });

  test("a universal nested reference folds anywhere", () => {
    const sheet = compile(
      `:root { --y: 10px; } .a { --x: var(--y); }`,
    ).stylesheet();

    expect(declaredValue(sheet, "a", "x")).toBe(10);
  });
});

test("the fold does not depend on the order the rules are written in", () => {
  // `--y` has two declarations, so it is not a candidate at all, and `2px` is
  // the one that wins. Pruning a candidate only when its own turn came round
  // made that depend on whether `--x` was written above the declarations or
  // below them — and above them, the LOSING `1px` was folded in.
  const declarations = `:root { --y: 1px; } :root { --y: 2px; }`;
  const reference = `.a { --x: var(--y); width: var(--x); }`;

  const varFirst = compile(`${reference} ${declarations}`).stylesheet();
  const varLast = compile(`${declarations} ${reference}`).stylesheet();

  for (const sheet of [varFirst, varLast]) {
    expect(foldedValue(sheet, "a", "width")).toBeUndefined();
    expect(readsAtRuntime(sheet, "a")).toBe(true);
    expect(declaredValue(sheet, "a", "x")).toStrictEqual([{}, "var", "y", 1]);
  }
});
