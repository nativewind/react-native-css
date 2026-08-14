import { compile } from "react-native-css/compiler";

import type { StyleRule } from "../../compiler/compiler.types";
import {
  pseudoElementFieldPolicy,
  scopeRuleToPseudoElement,
} from "../../compiler/pseudo-elements";

interface CompiledClass {
  /** Every field of every rule except `s`, which the selector owns rather than the declarations */
  rules: Partial<StyleRule>[];
  warnings: ReturnType<ReturnType<typeof compile>["warnings"]>;
}

/**
 * Reads the whole rule, not just `d`. A pseudo-element declaration reaches the element through
 * any field a declaration can set — `v` carries the --__rn-css-color / --__rn-css-em mirrors
 * declarations.ts writes beside `color` and `font-size`, `c` registers a named container, and
 * `a` / `dv` make the host animated or variable-driven
 */
const compileFor = (css: string, className = "a"): CompiledClass => {
  const compiled = compile(css);
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
      rules: [{ d: [["#f00", ["selectionColor"]]] }],
      warnings: {},
    });
  });

  test("color paints neither the element nor its subtree", () => {
    // `color` in ::selection is the selected TEXT colour, which React Native cannot express.
    // declarations.ts mirrors every `color` into --__rn-css-color, which every descendant reads
    // as currentColor, so dropping it from `d` alone leaves the subtree painted
    expect(compileFor(`.a::selection { color: #ff0000; }`)).toStrictEqual({
      rules: [],
      warnings: { values: { "::selection": ["color"] } },
    });
  });

  test("font-size does not become the element's em base", () => {
    // declarations.ts mirrors every `font-size` into --__rn-css-em, which every em unit on the
    // element resolves against
    expect(compileFor(`.a::selection { font-size: 40px; }`)).toStrictEqual({
      rules: [],
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
    // A var() compiles to a style-function tuple rather than the static object every other
    // "unmapped is dropped" case takes, so it exercises the other branch of the scoping
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
      rules: [{ d: [["#f00", ["selectionColor"]]] }],
      warnings: { values: { "::selection": ["width"] } },
    });
  });

  test("an animation leaves no animated rule behind", () => {
    // `a` makes the host render through an animated component. With every animation
    // declaration scoped away there is nothing left for it to animate
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

    expect(rules).toStrictEqual([{ d: [["#f00", ["selectionColor"]]] }]);
    expect(warnings.values?.["::selection"]).toContain("transitionProperty");
  });

  test("container-name does not make the element a container", () => {
    // container-name is the one authored declaration that never reaches `d`
    expect(
      compileFor(
        `.a::selection { background-color: #ff0000; container-name: foo; }`,
      ),
    ).toStrictEqual({
      rules: [{ d: [["#f00", ["selectionColor"]]] }],
      warnings: { values: { "::selection": ["container-name"] } },
    });
  });

  test("a mapped var() declaration keeps its variable subscription", () => {
    // The counterpart of the drops above: `dv` is rebuilt, not blanket-cleared, or the
    // runtime stops resolving the variable the surviving declaration reads
    expect(
      compileFor(`.a::selection { background-color: var(--x); }`),
    ).toStrictEqual({
      rules: [{ d: [[[{}, "var", "x", 1], ["selectionColor"], 1]], dv: 1 }],
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
  test("color maps to placeholderTextColor and sets nothing else", () => {
    // The --__rn-css-color mirror leaks here too, even though the declaration IS mapped:
    // placeholderTextColor is the placeholder's colour, never the element's currentColor
    expect(compileFor(`.a::placeholder { color: #ff0000; }`)).toStrictEqual({
      rules: [{ d: [["#f00", ["placeholderTextColor"]]] }],
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

describe("rules without a pseudo-element", () => {
  test("a plain rule on the same class keeps every field", () => {
    // Control for an over-broad fix: scoping runs per selector, so a rule that reaches the
    // element directly keeps its static object AND the --__rn-css-color mirror
    expect(compileFor(`.a { color: #ff0000; }`)).toStrictEqual({
      rules: [{ d: [{ color: "#f00" }], v: [["__rn-css-color", "#f00"]] }],
      warnings: {},
    });
  });

  test("the unscoped half of a grouped selector is untouched", () => {
    // Both selectors share one rule object, so scoping the pseudo-element half by mutation
    // rather than by rebuilding would strip the plain half too
    const css = `.a::selection, .b { background-color: #ff0000; }`;

    expect(compileFor(css, "a").rules).toStrictEqual([
      { d: [["#f00", ["selectionColor"]]] },
    ]);
    expect(compileFor(css, "b").rules).toStrictEqual([
      { d: [{ backgroundColor: "#f00" }] },
    ]);
  });
});

describe("field policy", () => {
  const policyFields = Object.keys(pseudoElementFieldPolicy).filter(
    (key): key is keyof typeof pseudoElementFieldPolicy =>
      key in pseudoElementFieldPolicy,
  );

  test("the policy classifies at least one field of each kind", () => {
    // Without this, an empty or single-kind policy would make the table below assert nothing
    for (const kind of ["selector", "rebuilt", "dropped"] as const) {
      expect(
        policyFields.filter(
          (field) => pseudoElementFieldPolicy[field] === kind,
        ),
      ).not.toStrictEqual([]);
    }
  });

  test("a selector field is carried over and a dropped field never is", () => {
    // Driven off the policy rather than a hand-written list, so classifying a new StyleRule
    // field here is what puts it under test
    const populated: StyleRule = {
      s: [1, 1],
      d: [["#f00", "backgroundColor"]],
      v: [["__rn-css-color", "#f00"]],
      c: ["c:foo"],
      dv: 1,
      a: true,
      target: "style",
      m: [[">=", "width", 100]],
      p: { h: 1 },
      cq: [{ m: [">=", "width", 100] }],
      aq: [["d", "x"]],
    };

    const { rule: scoped } = scopeRuleToPseudoElement(populated, "selection");

    expect(scoped).toBeDefined();

    for (const field of policyFields) {
      switch (pseudoElementFieldPolicy[field]) {
        case "selector":
          expect(scoped).toHaveProperty(field, populated[field]);
          break;
        case "dropped":
          expect(scoped).not.toHaveProperty(field);
          break;
        case "rebuilt":
          // Asserted by the behaviour tests above, which pin what each is rebuilt from
          break;
      }
    }
  });
});
