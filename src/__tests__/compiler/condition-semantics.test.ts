import { compile, type StyleRule } from "react-native-css/compiler";

function compileChildConditions(css: string): Pick<StyleRule, "m" | "cq">[] {
  return (compile(css).stylesheet().s ?? []).flatMap(([className, rules]) =>
    className === "child" ? rules.map(({ m, cq }) => ({ m, cq })) : [],
  );
}

// CSS Conditional 5 §5.4: an unknown size feature or an unresolvable value selects no container
test.each([
  "@container (fictional-feature > 10px)",
  "@container (fictional-feature > 10px) or (width > 400px)",
  "@container not (fictional-feature > 10px)",
  "@container (width > env(safe-area-inset-top))",
  "@container (width > env(safe-area-inset-top)) or (width > 400px)",
])("%s emits no block", (prelude) => {
  expect(
    compileChildConditions(`${prelude} { .child { color: red } }`),
  ).toStrictEqual([]);
});

test.each<[string, Pick<StyleRule, "m" | "cq">]>([
  ["@container style(--foo: bar)", { m: undefined, cq: [{ m: ["?"] }] }],
  [
    "@container not style(--foo: bar)",
    { m: undefined, cq: [{ m: ["!", ["?"]] }] },
  ],
  [
    "@container style(--foo: bar) or (width > 400px)",
    { m: undefined, cq: [{ m: ["|", [["?"], [">", "width", 400]]] }] },
  ],
  [
    "@media (width > env(safe-area-inset-top))",
    { m: [[">", "width", null]], cq: undefined },
  ],
  [
    "@media not (width: env(safe-area-inset-top))",
    { m: [["!", ["=", "width", null]]], cq: undefined },
  ],
  ["@media (grid: 0)", { m: [["=", "grid", 0]], cq: undefined }],
  ["@media (grid: 1)", { m: [["=", "grid", 1]], cq: undefined }],
])("%s compiles to %j", (prelude, conditions) => {
  expect(
    compileChildConditions(`${prelude} { .child { color: red } }`),
  ).toStrictEqual([conditions]);
});

test("a media query list keeps a branch whose value the compiler cannot resolve", () => {
  expect(
    compileChildConditions(
      "@media (width > env(safe-area-inset-top)), (width > 400px) { .child { color: red } }",
    ),
  ).toStrictEqual([
    { m: [[">", "width", null]], cq: undefined },
    { m: [[">", "width", 400]], cq: undefined },
  ]);
});
