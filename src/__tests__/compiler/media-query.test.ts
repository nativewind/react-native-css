import { compile } from "react-native-css/compiler";

describe("platform media queries", () => {
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
              s: [2, 1],
              d: [{ color: "#f00" }],
              m: [
                [
                  "&",
                  [
                    ["=", "platform", "android"],
                    [">=", "width", 500],
                  ],
                ],
              ],
              v: [["__rn-css-color", "#f00"]],
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
              s: [2, 1],
              d: [{ color: "#f00" }],
              m: [
                [
                  "&",
                  [
                    ["=", "platform", "ios"],
                    [">=", "width", 500],
                  ],
                ],
              ],
              v: [["__rn-css-color", "#f00"]],
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

// The runtime resolves this condition against the `colorScheme` observable
// (`src/native/conditions/media-query.ts`). `light-dark()` reaches the same
// condition, but the compiler synthesises it there — this covers the parse.
test("@media (prefers-color-scheme: dark)", () => {
  const compiled = compile(`
    @media (prefers-color-scheme: dark) {
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
            m: [["=", "prefers-color-scheme", "dark"]],
            v: [["__rn-css-color", "#f00"]],
          },
        ],
      ],
    ],
  });
});

test("@media (prefers-color-scheme: light)", () => {
  const compiled = compile(`
    @media (prefers-color-scheme: light) {
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
            m: [["=", "prefers-color-scheme", "light"]],
            v: [["__rn-css-color", "#f00"]],
          },
        ],
      ],
    ],
  });
});
