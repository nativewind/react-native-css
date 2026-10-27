import { compile } from "react-native-css/compiler";

test.each(["android", "ios"])(
  "platform media queries combine %s and width conditions",
  (platform) => {
    const result = compile(
      `@media ${platform} and (min-width: 500px) { .my-class { color: red; } }`,
    ).stylesheet();
    const rule = result.s?.[0]?.[1][0];
    expect(rule?.d).toContainEqual({ color: "#f00" });
    expect(rule?.m).toEqual([
      [
        "&",
        [
          ["=", "platform", platform],
          [">=", "width", 500],
        ],
      ],
    ]);
  },
);

test("@media (prefers-color-scheme) conditions a rule and a :root variable", () => {
  const compiled = compile(`
    .my-class { color: green; }
    @media (prefers-color-scheme: light) {
      .my-class { color: blue; }
      :root { --scheme-color: #00f; }
    }
    @media (prefers-color-scheme: dark) {
      .my-class { color: red; }
      :root { --scheme-color: #f0f; }
    }
    .scheme-variable { color: var(--scheme-color); }
  `);

  const stylesheet = compiled.stylesheet();
  expect(stylesheet.s?.[0]?.[1].map((rule) => [rule.d, rule.m])).toStrictEqual([
    [[{ color: "#008000" }], undefined],
    [[{ color: "#00f" }], [["=", "prefers-color-scheme", "light"]]],
    [[{ color: "#f00" }], [["=", "prefers-color-scheme", "dark"]]],
  ]);
  expect(stylesheet.vr).toStrictEqual([
    [
      "scheme-color",
      [
        ["#f0f", [["=", "prefers-color-scheme", "dark"]]],
        ["#00f", [["=", "prefers-color-scheme", "light"]]],
      ],
    ],
  ]);
});

test("@media (hover: hover)", () => {
  const compiled = compile(`
    @media (hover: hover) {
      .my-class { color: red; }
    }
  `);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "my-class",
        [
          {
            s: [2, 1],
            d: [{ color: "#f00" }],
            m: [["=", "hover", "hover"]],
            v: [["__rn-css-color", "#f00"]],
          },
        ],
      ],
    ],
  });
});
