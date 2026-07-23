import { compile } from "react-native-css/compiler";

test("hello world", () => {
  const compiled = compile(`
.my-class {
  color: red;
}`);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "my-class",
        [
          {
            d: [
              {
                color: "#f00",
              },
            ],
            s: [1, 1],
            v: [["__rn-css-color", "#f00"]],
          },
        ],
      ],
    ],
  });
});

test("reads global CSS variables", () => {
  const compiled = compile(
    `@layer theme {
      :root, :host {
        --color-red-500: oklch(63.7% 0.237 25.331);
      }
    }`,
    {
      inlineVariables: false,
    },
  );

  expect(compiled.stylesheet()).toStrictEqual({
    vr: [["color-red-500", [["#fb2c36"]]]],
  });
});

test(":root CSS variables with media queries", () => {
  const compiled = compile(
    `:root {
        @media ios {
          & {
            --my-var: System;
          }
        }

        @media android {
          & {
            --my-var: SystemAndroid;
          }
        }
      }
    `,
    {
      inlineVariables: false,
    },
  );

  expect(compiled.stylesheet()).toStrictEqual({
    vr: [
      [
        "my-var",
        [
          ["SystemAndroid", [["=", "platform", "android"]]],
          ["System", [["=", "platform", "ios"]]],
        ],
      ],
    ],
  });
});

test.skip("removes unused CSS variables", () => {
  const compiled = compile(`
    .test { 
      --blue: blue;
      --green: green;
      --red: red;
      color: var(--red, var(--blue))
    }
  `);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "test",
        [
          [
            {
              s: [1, 1],
              v: [
                ["blue", "blue"],
                ["red", "red"],
              ],
              dv: 1,
              d: [[[{}, "var", ["red", [{}, "var", ["blue"]]]], "color", 1]],
            },
          ],
        ],
      ],
    ],
  });
});

test.skip("preserves unused CSS variables with preserve-variables", () => {
  const compiled = compile(`
    @react-native config {
      preserve-variables: --green, --blue;
    }

    .test { 
      --green: green;
      --red: red;
      color: var(--red)
    }
  `);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "test",
        [
          [
            {
              s: [1, 1],
              v: [
                ["green", "green"],
                ["red", "red"],
              ],
              d: [[[{}, "var", ["red"]], "color", 1]],
              dv: 1,
            },
          ],
        ],
      ],
    ],
  });
});

test("multiple rules with same selector", () => {
  const compiled = compile(`
.redOrGreen:hover { 
  color: green; 
} 
  
.redOrGreen { 
  color: red; 
}
`);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "redOrGreen",
        [
          {
            d: [
              {
                color: "#f00",
              },
            ],
            s: [2, 1],
            v: [["__rn-css-color", "#f00"]],
          },
          {
            d: [
              {
                color: "#008000",
              },
            ],
            p: {
              h: 1,
            },
            s: [1, 2],
            v: [["__rn-css-color", "#008000"]],
          },
        ],
      ],
    ],
  });
});

test.skip("transitions", () => {
  const compiled = compile(`
    .test { 
      color: red;
      transition: color 1s linear;
    }
  `);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "test",
        [
          [
            {
              d: [
                {
                  color: "#ff0000",
                  transitionDelay: [0],
                  transitionDuration: [1000],
                  transitionProperty: ["color"],
                  transitionTimingFunction: ["linear"],
                },
              ],
              s: [1, 1],
            },
          ],
        ],
      ],
    ],
  });
});

test.skip("animations", () => {
  const compiled = compile(`
    .test { 
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `);

  expect(compiled.stylesheet()).toStrictEqual({
    k: [
      [
        "spin",
        [
          {
            0: { transform: [[{}, "rotate", "0deg"]] },
            100: { transform: [[{}, "rotate", "360deg"]] },
          },
        ],
      ],
    ],
    s: [
      [
        "test",
        [
          [
            {
              a: 1,
              d: [
                {
                  animationDelay: [0],
                  animationDirection: ["normal"],
                  animationDuration: [1000],
                  animationFillMode: ["none"],
                  animationIterationCount: ["infinite"],
                  animationName: [[{}, "animation", ["spin"], 1]],
                  animationPlayState: ["running"],
                  animationTimingFunction: ["linear"],
                },
              ],
              s: [1, 1],
            },
          ],
        ],
      ],
    ],
  });
});

test("breaks apart comma separated variables", () => {
  const compiled = compile(
    `
    :root { 
      --test: blue, green;
    }
  `,
    {
      inlineVariables: false,
    },
  );

  expect(compiled.stylesheet()).toStrictEqual({
    vr: [["test", [[["blue", "green"]]]]],
  });
});

test("light-dark()", () => {
  const compiled = compile(`
.my-class {
  background-color: light-dark(#333b3c, #efefec);
}`);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "my-class",
        [
          {
            d: [
              {
                backgroundColor: "#333b3c",
              },
            ],
            s: [1, 1],
          },
          {
            d: [
              {
                backgroundColor: "#efefec",
              },
            ],
            m: [["=", "prefers-color-scheme", "dark"]],
            s: [1, 1],
          },
        ],
      ],
    ],
  });
});

test("media query nested in rules", () => {
  const compiled = compile(`
.my-class {
  color: red;
  @media (min-width: 600px) {
    color: blue;

    @media (min-width: 400px) {
      background-color: green;
    }
  }

  @media (min-width: 100px) {
    background-color: yellow;

  }
}`);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "my-class",
        [
          {
            d: [{ color: "#f00" }],
            s: [1, 1],
            v: [["__rn-css-color", "#f00"]],
          },
          {
            d: [
              {
                color: "#00f",
              },
            ],
            m: [[">=", "width", 600]],
            s: [2, 1],
            v: [["__rn-css-color", "#00f"]],
          },
          {
            d: [{ backgroundColor: "#008000" }],
            m: [
              [">=", "width", 600],
              [">=", "width", 400],
            ],
            s: [3, 1],
          },
          {
            d: [{ backgroundColor: "#ff0" }],
            m: [[">=", "width", 100]],
            s: [4, 1],
          },
        ],
      ],
    ],
  });
});

test("container queries", () => {
  const compiled = compile(`
  @container (width > 400px) {
    .child {
      color: blue;
    }
  }`);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "child",
        [
          {
            cq: [{ m: [">", "width", 400] }],
            d: [{ color: "#00f" }],
            s: [2, 1],
            v: [["__rn-css-color", "#00f"]],
          },
        ],
      ],
    ],
  });
});

test("warnings", () => {
  const compiled = compile(`
.my-class {
    invalid-property: red;
    z-index: auto; 
    color: random();
}`);

  expect(compiled.stylesheet()).toStrictEqual({});

  expect(compiled.warnings()).toStrictEqual({
    properties: ["invalid-property"],
    values: {
      "z-index": ["auto"],
      "color": ["random()"],
    },
  });
});

test("simplifies rem", () => {
  const compiled = compile(`.test {
    border-width: calc(10rem + 2px);
  }`);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "test",
        [
          {
            d: [
              {
                borderWidth: 142,
              },
            ],
            s: [1, 1],
          },
        ],
      ],
    ],
  });
});

describe("CSS-wide color keywords", () => {
  const stylesheetFor = (value: string) =>
    compile(`.child { color: ${value}; }`).stylesheet();

  test("compiles to the inherited-color variable instead of being dropped", () => {
    // lightningcss emits `color: inherit` as an UnparsedProperty (the keyword is
    // not a CssColor), which parseUnparsed used to drop. Per CSS Color,
    // `currentcolor` used as the value of `color` is defined as `inherit`, so it
    // resolves to the same inherited-color variable. The ABSENCE of a `v` entry
    // is the no-self-reference guarantee — publishing this value as its own
    // --__rn-css-color would seed a circular var(--__rn-css-color).
    expect(stylesheetFor("inherit")).toStrictEqual({
      s: [
        [
          "child",
          [
            {
              s: [1, 1],
              d: [[[{}, "var", "__rn-css-color"], "color", 1]],
              dv: 1,
            },
          ],
        ],
      ],
    });
  });

  test("inherit and currentcolor compile identically (CSS Color spec identity)", () => {
    expect(stylesheetFor("inherit")).toStrictEqual(
      stylesheetFor("currentcolor"),
    );
  });

  test("currentcolor still resolves to the inherited-color variable (unchanged)", () => {
    // The token/ident branch that hunk 1 restructured also carries currentcolor;
    // this pins that currentcolor keeps compiling to the same lookup, and — like
    // inherit — never self-publishes a `v`.
    expect(stylesheetFor("currentcolor")).toStrictEqual({
      s: [
        [
          "child",
          [
            {
              s: [1, 1],
              d: [[[{}, "var", "__rn-css-color"], "color", 1]],
              dv: 1,
            },
          ],
        ],
      ],
    });
  });

  test("a normal color still publishes --__rn-css-color to descendants", () => {
    expect(stylesheetFor("red")).toStrictEqual({
      s: [
        [
          "child",
          [
            {
              s: [1, 1],
              d: [{ color: "#f00" }],
              v: [["__rn-css-color", "#f00"]],
            },
          ],
        ],
      ],
    });
  });

  test("inherit on a non-color property is still dropped (no inheritance context)", () => {
    expect(
      compile(`.child { font-size: inherit; }`).stylesheet(),
    ).toStrictEqual({});
  });

  test("color: initial is still dropped (different semantics, out of scope)", () => {
    expect(stylesheetFor("initial")).toStrictEqual({});
  });

  test("color: unset resolves like inherit (unset on an inherited property is inherit)", () => {
    // Per CSS Cascade, `unset` computes to `inherit` on inherited properties,
    // and `color` is inherited — so it maps to the same inherited-color variable.
    expect(stylesheetFor("unset")).toStrictEqual(stylesheetFor("inherit"));
  });

  test("keyword matching is case-insensitive (INHERIT)", () => {
    // CSS-wide keywords are case-insensitive; lightningcss does not fold case.
    expect(stylesheetFor("INHERIT")).toStrictEqual(stylesheetFor("inherit"));
  });

  test("currentColor (camelCase) resolves like currentcolor", () => {
    // The spelling React/JS authors reach for; it is valid, case-insensitive CSS.
    expect(stylesheetFor("currentColor")).toStrictEqual(
      stylesheetFor("currentcolor"),
    );
  });

  test("currentcolor resolves on a non-color property too (border-color)", () => {
    expect(
      compile(`.child { border-color: currentcolor; }`).stylesheet(),
    ).toStrictEqual({
      s: [
        [
          "child",
          [
            {
              s: [1, 1],
              d: [[[{}, "var", "__rn-css-color"], "borderColor", 1]],
              dv: 1,
            },
          ],
        ],
      ],
    });
  });
});
