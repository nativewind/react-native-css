import { compile, type MediaCondition } from "react-native-css/compiler";

import { sizeComparisons } from "../_media-features";

/**
 * Returns the media conditions the compiler attached to `.my-class`.
 *
 * The rest of the rule (declarations, specificity, extracted variables) is not
 * the subject of these tests, so reading just `m` keeps them from failing on
 * an unrelated change to how declarations are emitted.
 */
function compileMediaConditions(prelude: string): MediaCondition[] {
  const stylesheet = compile(`
    @media ${prelude} {
      .my-class { color: red; }
    }
  `).stylesheet();

  const rules =
    stylesheet.s?.flatMap(([className, ruleSet]) => {
      return className === "my-class" ? ruleSet : [];
    }) ?? [];

  return rules.flatMap((rule) => rule.m ?? []);
}

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

describe("size feature comparisons", () => {
  /**
   * Every comparison operator on every size axis, in both spellings — the same
   * census the `@container` compiler table and both runtime tables are built
   * from.
   *
   * `@media` and `@container` share one `MediaCondition` vocabulary and one
   * runtime primitive, so an operator that compiles differently between them
   * is a divergence with nowhere to be caught downstream. Both at-rules are
   * held to the identical table for that reason.
   */
  const cases: [prelude: string, condition: MediaCondition][] =
    sizeComparisons().map((row) => {
      const condition: MediaCondition = [row.operator, row.feature, 400];
      return [row.condition(400), condition];
    });

  test("the table covers the whole census", () => {
    expect(cases).toHaveLength(sizeComparisons().length);
    expect(cases.length).toBeGreaterThan(0);
  });

  test.each(cases)("@media %s", (prelude, condition) => {
    expect(compileMediaConditions(prelude)).toStrictEqual([condition]);
  });
});

describe("aspect-ratio", () => {
  /**
   * `<ratio>` is a media feature value like any other, so the same parse
   * serves `@media` and `@container`. A bare number is a ratio too — `1` is
   * `1/1`.
   */
  const cases: [prelude: string, condition: MediaCondition][] = [
    ["(aspect-ratio > 1)", [">", "aspect-ratio", 1]],
    ["(aspect-ratio: 2/1)", ["=", "aspect-ratio", 2]],
    ["(min-aspect-ratio: 16/9)", [">=", "aspect-ratio", 16 / 9]],
    ["(max-aspect-ratio: 16/9)", ["<=", "aspect-ratio", 16 / 9]],
  ];

  test.each(cases)("@media %s", (prelude, condition) => {
    expect(compileMediaConditions(prelude)).toStrictEqual([condition]);
  });
});

describe("interval (range pair) conditions", () => {
  /**
   * The emitted tuple is `["[]", name, start, startOperator, end,
   * endOperator]`, and it reads in CSS source order: `start startOperator
   * name endOperator end`. The runtime evaluates it in that order, so the two
   * operators are pinned separately from the two bounds — swapping either pair
   * reads as a valid interval and means something else.
   *
   * The `@container` compiler suite pins the same layout. One evaluator now
   * serves both at-rules, so a divergence in what either one emits reaches a
   * shared consumer that cannot tell them apart.
   */
  const cases: [prelude: string, condition: MediaCondition][] = [
    ["(400px < width < 800px)", ["[]", "width", 400, "<", 800, "<"]],
    ["(400px <= width <= 800px)", ["[]", "width", 400, "<=", 800, "<="]],
    ["(800px > width > 400px)", ["[]", "width", 800, ">", 400, ">"]],
    ["(400px < height < 800px)", ["[]", "height", 400, "<", 800, "<"]],
    ["(400px <= width < 800px)", ["[]", "width", 400, "<=", 800, "<"]],
  ];

  test.each(cases)("@media %s", (prelude, condition) => {
    expect(compileMediaConditions(prelude)).toStrictEqual([condition]);
  });
});
