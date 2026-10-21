import { compile } from "react-native-css/compiler";

function ruleNames(css: string) {
  return compile(css)
    .stylesheet()
    .s?.map(([name]) => name);
}

describe("a rule lightningcss cannot parse", () => {
  test.each([
    ["a media query with a <general-enclosed> condition", "@media (foo bar)"],
    [
      "a container query on scroll-state()",
      "@container scroll-state(stuck: top)",
    ],
  ])("drops %s, keeps its siblings and says so", (_, prelude) => {
    const css = `.a { color: red } ${prelude} { .b { color: blue } } .c { color: green }`;

    expect(ruleNames(css)).toStrictEqual(["a", "c"]);
    expect(compile(css).warnings().syntax).toHaveLength(1);
  });

  test("a declaration that fails to parse drops alone", () => {
    const css = `.a { color: var(); width: 10px } .c { color: green }`;

    expect(ruleNames(css)).toStrictEqual(["a", "c"]);
    expect(compile(css).stylesheet().s?.[0]).toStrictEqual([
      "a",
      [{ s: [1, 1], d: [{ width: 10 }] }],
    ]);
  });
});
