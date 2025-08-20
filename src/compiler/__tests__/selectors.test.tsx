import { getClassNameSelectors } from "../selector-builder";

test("empty", () => {
  expect(getClassNameSelectors([])).toStrictEqual([]);
});

test(".my-class { &:is(:where(.my-parent, .my-second-parent):hover *) {} }", () => {
  const result = getClassNameSelectors([
    [
      {
        type: "class",
        name: "my-class",
      },
      {
        type: "nesting",
      },
      {
        type: "pseudo-class",
        kind: "is",
        selectors: [
          [
            {
              type: "pseudo-class",
              kind: "where",
              selectors: [
                [
                  {
                    type: "class",
                    name: "my-parent",
                  },
                ],

                [
                  {
                    type: "class",
                    name: "my-second-parent",
                  },
                ],
              ],
            },
            {
              type: "pseudo-class",
              kind: "hover",
            },
            {
              type: "combinator",
              value: "descendant",
            },
            {
              type: "universal",
            },
          ],
        ],
      },
    ],
  ]);

  expect(result).toStrictEqual([
    {
      className: "my-class",
      containerQuery: [
        {
          n: "g:my-parent",
          p: {
            h: 1,
          },
        },
      ],
      specificity: [0, 2],
      type: "className",
    },
    {
      className: "my-class",
      containerQuery: [
        {
          n: "g:my-second-parent",
          p: {
            h: 1,
          },
        },
      ],
      specificity: [0, 2],
      type: "className",
    },
  ]);
});
