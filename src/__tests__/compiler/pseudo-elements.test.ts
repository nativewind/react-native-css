import { compile, type CompilerOptions } from "react-native-css/compiler";

import type { StyleRule } from "../../compiler/compiler.types";

interface CompiledClass {
  /** Every field of every rule except `s`, which the selector owns rather than the declarations */
  rules: Partial<StyleRule>[];
  warnings: ReturnType<ReturnType<typeof compile>["warnings"]>;
}

const compileFor = (
  css: string,
  className = "a",
  options: CompilerOptions = {},
): CompiledClass => {
  const compiled = compile(css, options);
  const rules = (compiled
    .stylesheet()
    .s?.find(([name]) => name === className)?.[1] ?? []) as StyleRule[];

  return {
    rules: rules.map((rule) => {
      const fields: Partial<StyleRule> = { ...rule };
      delete fields.s;
      return fields;
    }),
    warnings: compiled.warnings(),
  };
};

describe("::selection", () => {
  test("background-color maps to selectionColor and sets nothing else", () => {
    expect(
      compileFor(`.a::selection { background-color: #ff0000; }`),
    ).toStrictEqual({
      rules: [{ pe: "selection", d: [["#f00", ["selectionColor"]]] }],
      warnings: {},
    });
  });

  test("color is dropped and stays the pseudo-element's currentcolor", () => {
    expect(compileFor(`.a::selection { color: #ff0000; }`)).toStrictEqual({
      rules: [{ pe: "selection", v: [["__rn-css-color", "#f00"]] }],
      warnings: { values: { "::selection": ["color"] } },
    });
  });

  test("font-size is dropped and its em stays with the pseudo-element", () => {
    expect(compileFor(`.a::selection { font-size: 40px; }`)).toStrictEqual({
      rules: [{ pe: "selection", v: [["__rn-css-em", 40]] }],
      warnings: { values: { "::selection": ["fontSize"] } },
    });
  });

  test("an unmapped static declaration is dropped", () => {
    expect(
      compileFor(`.a::selection { width: 10px; height: 5px; }`),
    ).toStrictEqual({
      rules: [],
      warnings: { values: { "::selection": ["width", "height"] } },
    });
  });

  test("an unmapped var() declaration is dropped", () => {
    expect(compileFor(`.a::selection { width: var(--x); }`)).toStrictEqual({
      rules: [],
      warnings: { values: { "::selection": ["width"] } },
    });
  });

  test("an unmapped style-function declaration is dropped", () => {
    expect(
      compileFor(`.a::selection { transform: translateX(10px); }`),
    ).toStrictEqual({
      rules: [],
      warnings: { values: { "::selection": ["transform"] } },
    });
  });

  test("an unmapped declaration beside a mapped one is still dropped", () => {
    expect(
      compileFor(`.a::selection { background-color: #ff0000; width: 10px; }`),
    ).toStrictEqual({
      rules: [{ pe: "selection", d: [["#f00", ["selectionColor"]]] }],
      warnings: { values: { "::selection": ["width"] } },
    });
  });

  test("an animation leaves no animated rule behind", () => {
    const { rules, warnings } = compileFor(
      `.a::selection { animation: spin 1s; }`,
    );

    expect(rules).toStrictEqual([]);
    expect(warnings.values?.["::selection"]).toContain("animationName");
  });

  test("a transition beside a mapped declaration does not animate the element", () => {
    const { rules, warnings } = compileFor(
      `.a::selection { background-color: #ff0000; transition: background-color 1s; }`,
    );

    expect(rules).toStrictEqual([
      { pe: "selection", d: [["#f00", ["selectionColor"]]] },
    ]);
    expect(warnings.values?.["::selection"]).toContain("transitionProperty");
  });

  test.each([
    "container-name: foo",
    "container-type: inline-size",
    "container: foo / inline-size",
  ])("`%s` does not make the element a container", (declaration) => {
    expect(
      compileFor(
        `.a::selection { background-color: #ff0000; ${declaration}; }`,
      ),
    ).toStrictEqual({
      rules: [{ pe: "selection", d: [["#f00", ["selectionColor"]]] }],
      warnings: { values: { "::selection": ["container"] } },
    });
  });

  test("container-name: none registers no container and reports no drop", () => {
    // `none` empties `c` rather than leaving it absent
    expect(
      compileFor(
        `.a::selection { background-color: #ff0000; container-name: none; }`,
      ),
    ).toStrictEqual({
      rules: [{ pe: "selection", d: [["#f00", ["selectionColor"]]] }],
      warnings: {},
    });
  });

  test("every declaration is scoped, not only the first", () => {
    expect(
      compileFor(
        `.a::selection { background-color: #ff0000; transform: translateX(1px); }`,
      ),
    ).toStrictEqual({
      rules: [{ pe: "selection", d: [["#f00", ["selectionColor"]]] }],
      warnings: { values: { "::selection": ["transform"] } },
    });
  });

  test("a nested property path is reported the way the runtime reads it", () => {
    expect(
      compileFor(`.a::selection { text-shadow: 1px 2px 3px red; }`).warnings,
    ).toStrictEqual({
      values: {
        "::selection": [
          "textShadowColor",
          "textShadowRadius",
          "textShadowOffset.width",
          "textShadowOffset.height",
        ],
      },
    });

    expect(
      compileFor(`.a::selection { box-shadow: 1px 2px 3px red; }`).warnings,
    ).toStrictEqual({
      values: {
        "::selection": [
          "boxShadow[0].color",
          "boxShadow[0].offsetX",
          "boxShadow[0].offsetY",
          "boxShadow[0].blurRadius",
          "boxShadow[0].spreadDistance",
        ],
      },
    });
  });

  test("a delayed declaration that reads no variable does not set dv", () => {
    // `em` delays a declaration without making it read a variable
    expect(
      compileFor(`.a::selection { background-color: hsl(calc(1em) 50% 50%); }`),
    ).toStrictEqual({
      rules: [
        {
          pe: "selection",
          d: [
            [
              [{}, "hsl", [[{}, "calc", [[{}, "em", 1, 1]]], "50%", "50%"]],
              ["selectionColor"],
              1,
            ],
          ],
        },
      ],
      warnings: {},
    });
  });

  test("a mapped var() declaration keeps its variable subscription", () => {
    expect(
      compileFor(`.a::selection { background-color: var(--x); }`),
    ).toStrictEqual({
      rules: [
        {
          pe: "selection",
          d: [[[{}, "var", "x", 1], ["selectionColor"], 1]],
          dv: 1,
        },
      ],
      warnings: {},
    });
  });

  test("light-dark() scopes the dark value as well", () => {
    expect(
      compileFor(
        `.a::selection { background-color: light-dark(#123456, #654321); }`,
      ),
    ).toStrictEqual({
      rules: [
        { pe: "selection", d: [["#123456", ["selectionColor"]]] },
        {
          pe: "selection",
          d: [["#654321", ["selectionColor"]]],
          m: [["=", "prefers-color-scheme", "dark"]],
        },
      ],
      warnings: {},
    });
  });

  test("the selector's own conditions survive the scoping", () => {
    expect(
      compileFor(
        `@media (min-width: 100px) { .a:hover[data-x]::selection { background-color: #ff0000; } }`,
      ),
    ).toStrictEqual({
      rules: [
        {
          pe: "selection",
          d: [["#f00", ["selectionColor"]]],
          m: [[">=", "width", 100]],
          p: { h: 1 },
          aq: [["d", "x"]],
        },
      ],
      warnings: {},
    });
  });

  test("a container query survives the scoping", () => {
    expect(
      compileFor(
        `@container (min-width: 100px) { .a::selection { background-color: #ff0000; } }`,
      ),
    ).toStrictEqual({
      rules: [
        {
          pe: "selection",
          d: [["#f00", ["selectionColor"]]],
          cq: [{ m: [">=", "width", 100] }],
        },
      ],
      warnings: {},
    });
  });

  test("one authored rule warns once however many selectors it expands to", () => {
    const { warnings } = compileFor(
      `.a::selection, .b::selection { width: 10px; }`,
    );

    expect(warnings).toStrictEqual({ values: { "::selection": ["width"] } });
  });

  test("each pseudo-element in one authored rule reports its own drops", () => {
    const { warnings } = compileFor(
      `.a::selection, .b::placeholder { width: 10px; }`,
    );

    expect(warnings).toStrictEqual({
      values: { "::selection": ["width"], "::placeholder": ["width"] },
    });
  });

  test("the README example compiles to what the README says", () => {
    expect(
      compileFor(
        `.input::selection { background-color: red; color: white; width: 10px; }`,
        "input",
      ).warnings,
    ).toStrictEqual({ values: { "::selection": ["color", "width"] } });
  });
});

describe("::placeholder", () => {
  test("color maps to placeholderTextColor and stays its currentcolor", () => {
    expect(compileFor(`.a::placeholder { color: #ff0000; }`)).toStrictEqual({
      rules: [
        {
          pe: "placeholder",
          d: [["#f00", ["placeholderTextColor"]]],
          v: [["__rn-css-color", "#f00"]],
        },
      ],
      warnings: {},
    });
  });

  test("an unmapped declaration is dropped", () => {
    expect(
      compileFor(`.a::placeholder { background-color: #ff0000; }`),
    ).toStrictEqual({
      rules: [],
      warnings: { values: { "::placeholder": ["backgroundColor"] } },
    });
  });

  test("an unmapped var() declaration is dropped", () => {
    expect(
      compileFor(`.a::placeholder { background-color: var(--x); }`),
    ).toStrictEqual({
      rules: [],
      warnings: { values: { "::placeholder": ["backgroundColor"] } },
    });
  });
});

// CSS Pseudo-Elements 4 §3.5: the custom properties a pseudo-element sets are its own
describe("a pseudo-element's custom properties", () => {
  test("stay with the pseudo-element and are not reported", () => {
    expect(
      compileFor(`.a::selection { color: #ff0000; --brand: #123456; }`, "a", {
        inlineVariables: false,
      }),
    ).toStrictEqual({
      rules: [
        {
          pe: "selection",
          v: [
            ["__rn-css-color", "#f00"],
            ["brand", "#123456"],
          ],
        },
      ],
      warnings: { values: { "::selection": ["color"] } },
    });
  });

  test("keep a rule that declares nothing else", () => {
    expect(
      compileFor(`.a::placeholder { --x: #123456; }`, "a", {
        inlineVariables: false,
      }),
    ).toStrictEqual({
      rules: [{ pe: "placeholder", v: [["x", "#123456"]] }],
      warnings: {},
    });
  });

  test("are not inlined into the pseudo-element's own declaration", () => {
    const css = `.a::selection { --x: #123456; background-color: var(--x); }`;

    expect(compileFor(css)).toStrictEqual({
      rules: [
        {
          pe: "selection",
          d: [[[{}, "var", "x", 1], ["selectionColor"], 1]],
          v: [["x", "#123456"]],
          dv: 1,
        },
      ],
      warnings: {},
    });
    expect(compileFor(css)).toStrictEqual(
      compileFor(css, "a", { inlineVariables: false }),
    );
  });

  test.each([
    ["declared", `.a::selection { --x: #123456; } .b { color: var(--x); }`],
    [
      "declared !important",
      `.a::selection { --x: #123456 !important; } .b { color: var(--x); }`,
    ],
    [
      "declared through nesting",
      `.a { &::selection { --x: #123456; } } .b { color: var(--x); }`,
    ],
  ])("are not inlined into an element when %s", (_name, css) => {
    const { rules } = compileFor(css, "b");

    expect(rules).toStrictEqual(
      compileFor(css, "b", { inlineVariables: false }).rules,
    );
    expect(rules[0]?.d).toStrictEqual([[[{}, "var", "x", 1], "color", 1]]);
  });

  test.each([
    [
      "an element's",
      `.p { --x: #123456; } .a::selection { background-color: var(--x); }`,
    ],
    [
      "one elements and pseudo-elements share",
      `*, ::before, ::after { --x: #123456; } .a::selection { background-color: var(--x); }`,
    ],
  ])("leave %s custom property to the optimization", (_name, css) => {
    expect(compileFor(css).rules).toStrictEqual([
      { pe: "selection", d: [["#123456", ["selectionColor"]]] },
    ]);
  });
});

describe("rules without a pseudo-element", () => {
  test("a plain rule on the same class keeps every field", () => {
    expect(compileFor(`.a { color: #ff0000; }`)).toStrictEqual({
      rules: [{ d: [{ color: "#f00" }], v: [["__rn-css-color", "#f00"]] }],
      warnings: {},
    });
  });

  test("a plain rule's light-dark() keeps its dark rule as it is", () => {
    expect(
      compileFor(`.a { background-color: light-dark(#123456, #654321); }`)
        .rules,
    ).toStrictEqual([
      { d: [{ backgroundColor: "#123456" }] },
      {
        d: [{ backgroundColor: "#654321" }],
        m: [["=", "prefers-color-scheme", "dark"]],
      },
    ]);
  });

  test("the unscoped half of a grouped selector is untouched", () => {
    const css = `.a::selection, .b { background-color: #ff0000; --x: #123456; }`;
    const options = { inlineVariables: false } as const;

    expect(compileFor(css, "a", options).rules).toStrictEqual([
      {
        pe: "selection",
        d: [["#f00", ["selectionColor"]]],
        v: [["x", "#123456"]],
      },
    ]);
    expect(compileFor(css, "b", options).rules).toStrictEqual([
      { d: [{ backgroundColor: "#f00" }], v: [["x", "#123456"]] },
    ]);
  });
});
