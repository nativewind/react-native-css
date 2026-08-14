import { compile } from "react-native-css/compiler";

describe.skip("platform media queries", () => {
  test("android", () => {
    const compiled = compile(`
    @media android and (min-width: 500px) {
      .my-class { color: red; }
    }
  `);

    expect(compiled.stylesheet()).toStrictEqual({
      s: [
        [
          "my-class",
          [
            {
              s: [1, 1],
              d: [{ color: "#ff0000" }],
              m: [
                [
                  "&",
                  [
                    ["=", "platform", "android"],
                    [">=", "width", 500],
                  ],
                ],
              ],
            },
          ],
        ],
      ],
    });
  });

  test("ios", () => {
    const compiled = compile(`
    @media ios and (min-width: 500px) {
      .my-class { color: red; }
    }
  `);

    expect(compiled.stylesheet()).toStrictEqual({
      s: [
        [
          "my-class",
          [
            {
              s: [1, 1],
              d: [{ color: "#ff0000" }],
              m: [
                "&",
                [
                  ["=", "platform", "ios"],
                  [">=", "width", 500],
                ],
              ],
            },
          ],
        ],
      ],
    });
  });
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

describe("aspect-ratio", () => {
  /**
   * Returns the media conditions the compiler attached to `.my-class`.
   */
  function compileMediaConditions(prelude: string): unknown {
    const stylesheet = compile(`
      @media ${prelude} {
        .my-class { color: red; }
      }
    `).stylesheet();

    return stylesheet.s?.flatMap(([className, ruleSet]) => {
      return className === "my-class" ? ruleSet.map((rule) => rule.m) : [];
    });
  }

  /**
   * `<ratio>` is a media feature value like any other, so the same parse
   * serves `@media` and `@container`. A bare number is a ratio too — `1` is
   * `1/1`.
   */
  const cases: [prelude: string, conditions: unknown][] = [
    ["(aspect-ratio > 1)", [[[">", "aspect-ratio", 1]]]],
    ["(aspect-ratio: 2/1)", [[["=", "aspect-ratio", 2]]]],
    ["(min-aspect-ratio: 16/9)", [[[">=", "aspect-ratio", 16 / 9]]]],
    ["(max-aspect-ratio: 16/9)", [[["<=", "aspect-ratio", 16 / 9]]]],
  ];

  test.each(cases)("@media %s", (prelude, conditions) => {
    expect(compileMediaConditions(prelude)).toStrictEqual(conditions);
  });
});
