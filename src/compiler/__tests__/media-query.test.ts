import { compile } from "../compiler";

describe.skip("platform media queries", () => {
  test("android", () => {
    const compiled = compile(`
    @media android and (min-width: 500px) {
      .my-class { color: red; }
    }
  `);

    expect(compiled).toStrictEqual({
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

    expect(compiled).toStrictEqual({
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
