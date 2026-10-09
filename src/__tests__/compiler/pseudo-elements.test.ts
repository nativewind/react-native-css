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

const inlineVariablesOff = { inlineVariables: false } as const;

/** The value a rule writes to `prop`, whether it compiled to a static object or a dynamic entry */
const readWrittenValue = (
  rule: Partial<StyleRule> | undefined,
  prop: string,
): unknown => {
  for (const declaration of rule?.d ?? []) {
    if (!Array.isArray(declaration)) {
      if (Object.hasOwn(declaration, prop)) {
        return declaration[prop];
      }
      continue;
    }

    const path = declaration[1];

    if (path === prop || (Array.isArray(path) && path.join() === prop)) {
      return declaration[0];
    }
  }

  return undefined;
};

const readsCustomProperty = (value: unknown, name: string): boolean =>
  Array.isArray(value) &&
  ((value[1] === "var" &&
    (value[2] === name || (Array.isArray(value[2]) && value[2][0] === name))) ||
    value.some((entry) => readsCustomProperty(entry, name)));

const pseudoElements = [
  {
    selector: "::selection",
    property: "background-color",
    elementProp: "backgroundColor",
    prop: "selectionColor",
    pseudoElement: "selection",
  },
  {
    selector: "::placeholder",
    property: "color",
    elementProp: "color",
    prop: "placeholderTextColor",
    pseudoElement: "placeholder",
  },
] as const;

// The pseudo-element's rule is the element's rule for the same CSS, re-targeted at its prop
describe.each(pseudoElements)(
  "$selector compiles what an element would",
  ({ selector, property, elementProp, prop, pseudoElement }) => {
    test.each([
      "#ff0000",
      "var(--x)",
      "hsl(calc(1em) 50% 50%)",
      "color-mix(in srgb, #ff0000 50%, transparent)",
      "currentcolor",
    ])(`${property}: %s writes the element's value to ${prop}`, (value) => {
      const [scoped] = compileFor(
        `.a${selector} { ${property}: ${value}; }`,
        "a",
        inlineVariablesOff,
      ).rules;
      const [element] = compileFor(
        `.b { ${property}: ${value}; }`,
        "b",
        inlineVariablesOff,
      ).rules;

      expect(scoped?.pe).toBe(pseudoElement);
      expect(readWrittenValue(element, elementProp)).toBeDefined();
      expect(readWrittenValue(scoped, prop)).toStrictEqual(
        readWrittenValue(element, elementProp),
      );
      expect(scoped?.dv).toBe(element?.dv);
    });

    test("declares the variables an element would", () => {
      const declarations = `color: #ff0000; font-size: 40px; --brand: #123456;`;
      const [scoped] = compileFor(
        `.a${selector} { ${declarations} }`,
        "a",
        inlineVariablesOff,
      ).rules;
      const [element] = compileFor(
        `.b { ${declarations} }`,
        "b",
        inlineVariablesOff,
      ).rules;

      expect(element?.v?.length).toBeGreaterThan(0);
      expect(scoped?.v).toStrictEqual(element?.v);
    });
  },
);

describe("::selection", () => {
  test("background-color maps to selectionColor and sets nothing else", () => {
    expect(
      compileFor(`.a::selection { background-color: #ff0000; }`),
    ).toStrictEqual({
      rules: [{ pe: "selection", d: [["#f00", ["selectionColor"]]] }],
      warnings: {},
    });
  });

  test.each([
    ["color: #ff0000", "color"],
    ["font-size: 40px", "fontSize"],
  ])("`%s` writes no prop and is reported", (declaration, reported) => {
    const { rules, warnings } = compileFor(`.a::selection { ${declaration}; }`);

    expect(rules.map((rule) => rule.d)).toStrictEqual([undefined]);
    expect(warnings).toStrictEqual({ values: { "::selection": [reported] } });
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
  test("are not reported", () => {
    expect(
      compileFor(
        `.a::selection { color: #ff0000; --brand: #123456; }`,
        "a",
        inlineVariablesOff,
      ).warnings,
    ).toStrictEqual({ values: { "::selection": ["color"] } });
  });

  test("keep a rule that declares nothing else", () => {
    expect(
      compileFor(`.a::placeholder { --x: #123456; }`, "a", inlineVariablesOff),
    ).toStrictEqual({
      rules: [{ pe: "placeholder", v: [["x", "#123456"]] }],
      warnings: {},
    });
  });

  test("are not inlined into the pseudo-element's own declaration", () => {
    const css = `.a::selection { --x: #123456; background-color: var(--x); }`;
    const { rules } = compileFor(css);

    expect(rules).toStrictEqual(compileFor(css, "a", inlineVariablesOff).rules);
    expect(readsCustomProperty(rules[0]?.d, "x")).toBe(true);
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

    expect(rules).toStrictEqual(compileFor(css, "b", inlineVariablesOff).rules);
    expect(readsCustomProperty(rules[0]?.d, "x")).toBe(true);
  });

  test.each([
    [
      ":root's",
      `:root { --x: #123456; } .a::selection { background-color: var(--x); }`,
    ],
    [
      "the one elements and pseudo-elements share",
      `*, ::before, ::after { --x: #123456; } .a::selection { background-color: var(--x); }`,
    ],
  ])("leave %s custom property to the optimization", (_name, css) => {
    expect(readWrittenValue(compileFor(css).rules[0], "selectionColor")).toBe(
      "#123456",
    );
  });
});

describe("rules without a pseudo-element", () => {
  test("a plain rule on the same class compiles as it does alone", () => {
    expect(
      compileFor(
        `.a { color: #ff0000; } .a::selection { background-color: #0000ff; }`,
      ).rules[0],
    ).toStrictEqual(compileFor(`.a { color: #ff0000; }`).rules[0]);
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

    expect(compileFor(css, "a", inlineVariablesOff).rules).toStrictEqual([
      {
        pe: "selection",
        d: [["#f00", ["selectionColor"]]],
        v: [["x", "#123456"]],
      },
    ]);
    expect(compileFor(css, "b", inlineVariablesOff).rules).toStrictEqual([
      { d: [{ backgroundColor: "#f00" }], v: [["x", "#123456"]] },
    ]);
  });
});
