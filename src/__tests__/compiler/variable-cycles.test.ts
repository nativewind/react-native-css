import { compile } from "react-native-css/compiler";

function firstDeclaration(css: string, className: string): unknown {
  const entry = (compile(css).stylesheet().s ?? []).find(
    ([name]) => name === className,
  );
  if (!entry) {
    throw new Error(`the compiler emitted no rule for .${className}`);
  }
  return entry[1][0]?.d;
}

const CYCLES = [
  [
    "a variable referencing itself",
    `.t { --x: var(--x); color: var(--x) }`,
    "x",
  ],
  [
    "two variables referencing each other",
    `.t { --p: var(--q); --q: var(--p); color: var(--p) }`,
    "p",
  ],
  [
    "a three-step cycle",
    `.t { --a: var(--b); --b: var(--c); --c: var(--a); color: var(--a) }`,
    "a",
  ],
] as const;

describe("a variable cycle is left for the runtime rather than inlined", () => {
  test("the census is not empty, so the cases below are not vacuous", () => {
    expect(CYCLES.length).toBeGreaterThan(0);
  });

  test.each(CYCLES)("%s", (_label, css, variableName) => {
    expect(firstDeclaration(css, "t")).toStrictEqual([
      [[{}, "var", variableName, 1], "color", 1],
    ]);
  });
});

describe("a variable with no cycle is still inlined", () => {
  test("a direct value substitutes", () => {
    expect(
      firstDeclaration(`.t { --n: red; color: var(--n) }`, "t"),
    ).toStrictEqual([{ color: "#f00" }]);
  });

  test("a chain substitutes through every step", () => {
    expect(
      firstDeclaration(`.t { --a: red; --b: var(--a); color: var(--b) }`, "t"),
    ).toStrictEqual([{ color: "#f00" }]);
  });
});
