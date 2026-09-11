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
