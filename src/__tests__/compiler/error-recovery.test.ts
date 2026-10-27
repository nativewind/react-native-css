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
      "a container query with a <general-enclosed> condition",
      "@container (foo bar)",
    ],
  ])("drops %s, keeps its siblings and says so", (_, prelude) => {
    const css = `.a { color: red } ${prelude} { .b { color: blue } } .c { color: green }`;

    expect(ruleNames(css)).toStrictEqual(["a", "c"]);
    expect(compile(css).warnings().syntax).toHaveLength(1);
  });

  test("a media query with a value its feature does not take keeps its siblings and says so", () => {
    const css = `.a { color: red } @media (prefers-color-scheme: 0) { .b { color: blue } } .c { color: green }`;

    // lightningcss keeps a rule whose feature value it refuses, so whether .b compiles is the media query compiler's decision
    expect(ruleNames(css)).toEqual(expect.arrayContaining(["a", "c"]));
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
