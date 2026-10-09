import type {
  ReactNativeCssStyleSheet,
  StyleDescriptor,
  StyleRule,
} from "react-native-css/compiler";
import { compile } from "react-native-css/compiler";

function rulesFor(
  sheet: ReactNativeCssStyleSheet,
  className: string,
): StyleRule[] {
  return sheet.s?.find(([name]) => name === className)?.[1] ?? [];
}

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

function runtimeValue(
  sheet: ReactNativeCssStyleSheet,
  className: string,
  property: string,
): StyleDescriptor {
  for (const rule of rulesFor(sheet, className)) {
    for (const declaration of rule.d ?? []) {
      if (Array.isArray(declaration) && declaration[1] === property) {
        return declaration[0];
      }
    }
  }
  return undefined;
}

function readsAtRuntime(sheet: ReactNativeCssStyleSheet, className: string) {
  return rulesFor(sheet, className).some((rule) => rule.dv === 1);
}

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

    // An element carrying only `.child` never matched `.parent`, so it has no `--x`
    expect(foldedValue(sheet, "child", "width")).toBeUndefined();
    expect(readsAtRuntime(sheet, "child")).toBe(true);
    expect(declaredValue(sheet, "parent", "x")).toBe(10);
  });

  test("the same block is provable, and still folds", () => {
    const sheet = compile(`.a { --x: 10px; width: var(--x); }`).stylesheet();

    expect(foldedValue(sheet, "a", "width")).toBe(10);
    expect(readsAtRuntime(sheet, "a")).toBe(false);
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
    ["div", "every element descends from html, from no other element name"],
    [":hover", "a state is not a scope"],
    [".theme", "a class is the case this whole rule exists for"],
  ])("%s is not universal: %s", (selector) => {
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
    const sheet = compile(
      `${parent} { & { --x: 10px; } } .child { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "child", "width")).toBe(expected);
  });

  test("a nested selector under :root names its descendants, not every element", () => {
    const sheet = compile(
      `:root { * { --x: 10px; } } .child { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "child", "width")).toBeUndefined();
  });

  test("@layer does not narrow a universal scope", () => {
    const sheet = compile(
      `@layer theme { :root, :host { --x: 10px; } } .child { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "child", "width")).toBe(10);
  });
});

describe("a folded declaration is removed once nothing reads it", () => {
  test("a declaration whose every reference folded is removed", () => {
    const sheet = compile(`.a { --x: 10px; width: var(--x); }`).stylesheet();

    expect(foldedValue(sheet, "a", "width")).toBe(10);
    expect(declaredValue(sheet, "a", "x")).toBeUndefined();
  });

  test("a declaration another rule reads at runtime is kept", () => {
    const sheet = compile(
      `.a { --x: 10px; width: var(--x); } .b { height: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "a", "width")).toBe(10);
    expect(readsAtRuntime(sheet, "b")).toBe(true);
    expect(declaredValue(sheet, "a", "x")).toBe(10);
  });

  test.each([
    ["an rgb() alpha", `.a { --c: 0.5; color: rgb(255 0 0 / var(--c)); }`],
    [
      "a light-dark() branch",
      `.a { --c: 0.5; color: light-dark(rgb(255 0 0 / var(--c)), #00f); }`,
    ],
  ])("a reference inside %s keeps its declaration", (_name, css) => {
    const sheet = compile(css).stylesheet();

    expect(declaredValue(sheet, "a", "c")).toBe(0.5);
  });

  test("a variable declared initial folds to the reference's fallback", () => {
    const sheet = compile(
      `.a { --x: initial; width: var(--x, 10px); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "a", "width")).toBe(10);
  });

  test("every declaration of a fully folded chain is removed", () => {
    const sheet = compile(
      `.a { --y: 10px; --x: var(--y); width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "a", "width")).toBe(10);
    expect(declaredValue(sheet, "a", "x")).toBeUndefined();
    expect(declaredValue(sheet, "a", "y")).toBeUndefined();
  });

  test("a declaration read only by a removed declaration is removed", () => {
    const sheet = compile(
      `.a { --x: var(--y); height: 1px; } .b { --y: 10px; height: 2px; }`,
    ).stylesheet();

    expect(declaredValue(sheet, "a", "x")).toBeUndefined();
    expect(declaredValue(sheet, "b", "y")).toBeUndefined();
  });

  test("a declaration read by a kept declaration is kept", () => {
    const sheet = compile(
      `.a { --x: var(--y); height: 1px; } .b { --y: 10px; height: 2px; } .c { width: var(--x); }`,
    ).stylesheet();

    expect(declaredValue(sheet, "a", "x")).toStrictEqual([{}, "var", "y", 1]);
    expect(declaredValue(sheet, "b", "y")).toBe(10);
  });
});

describe("a conditional scope is not a universal one", () => {
  test.each([
    ["@media (min-width: 1px)", "media"],
    ["@container (min-width: 1px)", "container"],
  ])("%s wrapping :root", (atRule) => {
    const sheet = compile(
      `${atRule} { :root { --x: 10px; } } .child { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "child", "width")).toBeUndefined();
    expect(readsAtRuntime(sheet, "child")).toBe(true);
  });

  test("a conditional block still folds into itself", () => {
    // A query that switches the declaration off switches the reference off with it
    const sheet = compile(
      `@media (min-width: 1px) { .a { --x: 10px; width: var(--x); } }`,
    ).stylesheet();

    expect(foldedValue(sheet, "a", "width")).toBe(10);
  });
});

describe("@supports is decided when the stylesheet compiles", () => {
  test("a kept block's declarations apply unconditionally", () => {
    const sheet = compile(
      `@supports (color: color-mix(in lab, red, red)) { :root { --x: 10px; } }
       .child { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "child", "width")).toBe(10);
  });

  test("a dropped block's declarations do not apply", () => {
    const sheet = compile(
      `@supports (display: grid) { :root { --x: 10px; } }
       .child { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "child", "width")).toBeUndefined();
  });

  test("a dropped block's declaration is not a second definition", () => {
    const sheet = compile(
      `@supports (display: grid) { :root { --x: 20px; } }
       :root { --x: 10px; }
       .child { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "child", "width")).toBe(10);
  });
});

describe("a registered property", () => {
  test("inherits: false keeps a :root declaration from reaching other elements", () => {
    // An element other than the root holds the registered initial value, not the one `:root` declares
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

  test("inherits: false does not narrow a declaration on every element", () => {
    const sheet = compile(
      `@property --x { syntax: "<length>"; inherits: false; initial-value: 10px; }
       * { --x: 20px; }
       .b { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "b", "width")).toBe(20);
  });

  test("an undeclared property folds to its initial value", () => {
    const sheet = compile(
      `@property --x { syntax: "*"; inherits: false; initial-value: 10px; }
       .b { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "b", "width")).toBe(10);
  });

  test("the initial value wins over a fallback block the compiler drops", () => {
    // Tailwind's shape: the fallback serves browsers without @property, and the compiler drops it
    const sheet = compile(
      `@property --x { syntax: "*"; inherits: false; initial-value: 10px; }
       @supports ((-webkit-hyphens: none) and (not (margin-trim: inline))) {
         *, ::before, ::after, ::backdrop { --x: 20px; }
       }
       .b { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "b", "width")).toBe(10);
  });

  test("a typed initial value is left to the runtime", () => {
    const sheet = compile(
      `@property --x { syntax: "<length>"; inherits: false; initial-value: 10px; }
       .b { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "b", "width")).toBeUndefined();
    expect(readsAtRuntime(sheet, "b")).toBe(true);
  });

  test("a declared property does not fold its initial value across rules", () => {
    const sheet = compile(
      `@property --x { syntax: "*"; inherits: false; initial-value: 10px; }
       .a { --x: 20px; }
       .b { width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "b", "width")).toBeUndefined();
    expect(readsAtRuntime(sheet, "b")).toBe(true);
  });
});

describe("a variable's own value is held to the same terms", () => {
  test("a nested reference does not cross a block boundary", () => {
    const sheet = compile(
      `.a { --x: var(--y); width: var(--x); } .b { --y: 10px; }`,
    ).stylesheet();

    // `--y` belongs to `.b`, and folding it into `.a` would carry it to elements that never matched `.b`
    expect(foldedValue(sheet, "a", "width")).toBeUndefined();
    expect(runtimeValue(sheet, "a", "width")).toStrictEqual([
      {},
      "var",
      "y",
      1,
    ]);
    expect(declaredValue(sheet, "b", "y")).toBe(10);
  });

  test("a nested reference in the same block folds", () => {
    const sheet = compile(
      `.a { --y: 10px; --x: var(--y); width: var(--x); }`,
    ).stylesheet();

    expect(foldedValue(sheet, "a", "width")).toBe(10);
  });

  test("a universal nested reference folds into a kept declaration", () => {
    const sheet = compile(
      `:root { --y: 10px; } .a { --x: var(--y); } .b { width: var(--x); }`,
    ).stylesheet();

    expect(declaredValue(sheet, "a", "x")).toBe(10);
  });
});

test("the fold does not depend on the order the rules are written in", () => {
  // `--y` is declared twice, so it is not a candidate, and the winning `2px` is left to the runtime
  const declarations = `:root { --y: 1px; } :root { --y: 2px; }`;
  const reference = `.a { --x: var(--y); width: var(--x); }`;

  const varFirst = compile(`${reference} ${declarations}`).stylesheet();
  const varLast = compile(`${declarations} ${reference}`).stylesheet();

  for (const sheet of [varFirst, varLast]) {
    expect(foldedValue(sheet, "a", "width")).toBeUndefined();
    expect(runtimeValue(sheet, "a", "width")).toStrictEqual([
      {},
      "var",
      "y",
      1,
    ]);
  }
});
