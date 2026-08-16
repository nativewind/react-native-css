import type { MediaCondition } from "react-native-css/compiler";
import { compile } from "react-native-css/compiler";

import { serializeStyleSheet } from "../../metro/injection-code";

/** The media conditions of every rule compiled for `className`. */
function mediaConditions(css: string, className: string) {
  const rules =
    compile(css)
      .stylesheet()
      .s?.find(([name]) => name === className)?.[1] ?? [];

  return rules.map((rule): MediaCondition[] | undefined => rule.m);
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

describe("comma-separated media query lists", () => {
  test("compile to a union, not an intersection", () => {
    expect(
      mediaConditions(
        `@media (min-width: 100px), (min-width: 9999px) {
          .my-class { background-color: red; }
        }`,
        "my-class",
      ),
    ).toStrictEqual([
      [
        [
          "|",
          [
            [">=", "width", 100],
            [">=", "width", 9999],
          ],
        ],
      ],
    ]);
  });

  test("a single query is not wrapped", () => {
    expect(
      mediaConditions(
        `@media (min-width: 100px) {
          .my-class { background-color: red; }
        }`,
        "my-class",
      ),
    ).toStrictEqual([[[">=", "width", 100]]]);
  });

  test("a comma list and an `or` condition compile identically", () => {
    const comma = mediaConditions(
      `@media (min-width: 100px), (min-width: 9999px) {
        .my-class { background-color: red; }
      }`,
      "my-class",
    );

    const or = mediaConditions(
      `@media ((min-width: 100px) or (min-width: 9999px)) {
        .my-class { background-color: red; }
      }`,
      "my-class",
    );

    expect(comma).toStrictEqual(or);
  });

  test("nested @media rules still intersect", () => {
    expect(
      mediaConditions(
        `@media (min-width: 100px) {
          @media (min-height: 200px) {
            .my-class { background-color: red; }
          }
        }`,
        "my-class",
      ),
    ).toStrictEqual([
      [
        [">=", "width", 100],
        [">=", "height", 200],
      ],
    ]);
  });
});

describe("an operand the compiler cannot resolve", () => {
  // `env()` has no compile-time value. The operand compiles to `null`, the one
  // spelling of "no value" that survives `JSON.stringify` into a native bundle,
  // and it has to survive into the condition: a condition that is absent applies
  // unconditionally, so dropping the query is the opposite of refusing it.
  test("compiles to null beside a sibling operand", () => {
    expect(
      mediaConditions(
        `@media ((orientation: env(safe-area-inset-top)) and (min-width: 0px)) {
        .my-class { background-color: red; }
      }`,
        "my-class",
      ),
    ).toStrictEqual([
      [
        [
          "&",
          [
            ["=", "orientation", null],
            [">=", "width", 0],
          ],
        ],
      ],
    ]);
  });

  test("compiles to null as the only operand", () => {
    expect(
      mediaConditions(
        `@media (orientation: env(safe-area-inset-top)) {
        .my-class { background-color: red; }
      }`,
        "my-class",
      ),
    ).toStrictEqual([[["=", "orientation", null]]]);
  });

  test("survives the serializer that carries it to a device", () => {
    const conditions = mediaConditions(
      `@media (orientation: env(safe-area-inset-top)) {
        .my-class { background-color: red; }
      }`,
      "my-class",
    );

    expect(JSON.parse(serializeStyleSheet(conditions))).toStrictEqual(
      conditions,
    );
  });
});

test("a boolean feature compiles to a boolean condition", () => {
  expect(
    mediaConditions(
      `@media (width) {
        .my-class { background-color: red; }
      }`,
      "my-class",
    ),
  ).toStrictEqual([[["!!", "width"]]]);
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
