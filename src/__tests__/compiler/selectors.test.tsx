import { compile } from "react-native-css/compiler";

import { getClassNameSelectors } from "../../compiler/selector-builder";

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

test(".group-[.test]:text-white { &:is(:where(.group):is(.test) *) {}", () => {
  const result = getClassNameSelectors([
    [
      {
        type: "class",
        name: "group-[.test]:text-white",
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
                    name: "group",
                  },
                ],
              ],
            },
            {
              type: "pseudo-class",
              kind: "is",
              selectors: [
                [
                  {
                    type: "class",
                    name: "test",
                  },
                ],
              ],
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
      className: "group-[.test]:text-white",
      containerQuery: [
        {
          n: "g:group.test",
        },
      ],
      specificity: [0, 3],
      type: "className",
    },
  ]);
});

// HTML compares a dir value ASCII case-insensitively unless the selector carries s
test.each([
  ['[dir="RTL"]', "rtl"],
  ['[dir="Rtl"]', "rtl"],
  ['[dir="rtl"]', "rtl"],
  ['[dir="RTL" i]', "rtl"],
  ['[dir="RTL" s]', "RTL"],
])(".t%s compiles to the direction %p", (attribute, direction) => {
  const rule = compile(`.t${attribute} { color: red }`).stylesheet()
    .s?.[0]?.[1][0];

  expect(rule?.m).toStrictEqual([["=", "dir", direction]]);
});

test.each([
  ['[class="a b"]', ["a", "className", "=", "a b"]],
  ['[class~="b"]', ["a", "className", "~=", "b"]],
  ['[class*="b"]', ["a", "className", "*=", "b"]],
  ["[class]", ["a", "className"]],
  ['[data-state="open"]', ["d", "state", "=", "open"]],
  ["[disabled]", ["a", "disabled"]],
])(".t%s reads the prop it arrives on", (attribute, query) => {
  const rule = compile(`.t${attribute} { color: red }`).stylesheet()
    .s?.[0]?.[1][0];

  expect(rule?.aq).toStrictEqual([query]);
});

test("an ancestor [class~=…] reads className through the :is() site", () => {
  const rule = compile(
    `.child:is(:where(.group)[class~="active"] *) { color: red }`,
  )
    .stylesheet()
    .s?.find(([name]) => name === "child")?.[1][0];

  expect(rule?.cq).toStrictEqual([
    { n: "g:group", a: [["a", "className", "~=", "active"]] },
  ]);
});

test.each([
  ['[data-x="a"]', ["test"]],
  ['[|data-x="a"]', ["test"]],
  ['[*|data-x="a"]', ["test"]],
  ['[undeclared|data-x="a"]', []],
])(".test%s emits the rules %p", (attribute, rules) => {
  expect(
    compile(`.test${attribute} { width: 10px }`)
      .stylesheet()
      .s?.map(([name]) => name) ?? [],
  ).toStrictEqual(rules);
});

test("a declared namespace prefix emits no rule, and a sibling rule survives", () => {
  expect(
    compile(
      `@namespace ns url(http://example.com/ns); .dropped[ns|data-x="a"] { width: 10px } .kept[data-x="a"] { width: 10px }`,
    )
      .stylesheet()
      .s?.map(([name]) => name),
  ).toStrictEqual(["kept"]);
});

test("an ancestor's namespace-qualified attribute emits no rule through the :is() site", () => {
  expect(
    compile(
      `.child:is(:where(.group)[undeclared|data-x="a"] *) { width: 10px }`,
    )
      .stylesheet()
      .s?.find(([name]) => name === "child"),
  ).toBeUndefined();
});
