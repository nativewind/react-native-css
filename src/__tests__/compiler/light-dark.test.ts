import { compile } from "react-native-css/compiler";
import type {
  CompilerOptions,
  StyleDeclaration,
  StyleDescriptor,
  StyleRule,
} from "react-native-css/compiler";

/**
 * `light-dark()` compiles to two rules: the current one, carrying the light
 * branch, and an extra copy of it under `prefers-color-scheme: dark` carrying
 * the dark branch. These helpers read the pair back out of a compiled
 * stylesheet so a test can state what each half is allowed to contain.
 */
const rulesFor = (
  css: string,
  className: string,
  options?: CompilerOptions,
): StyleRule[] => {
  const ruleSets = compile(css, options).stylesheet().s ?? [];
  return ruleSets.flatMap(([name, rules]) => (name === className ? rules : []));
};

const isDarkRule = (rule: StyleRule): boolean =>
  Boolean(
    rule.m?.some(
      (condition) =>
        condition[0] === "=" &&
        condition[1] === "prefers-color-scheme" &&
        condition[2] === "dark",
    ),
  );

const darkRules = (
  css: string,
  className: string,
  options?: CompilerOptions,
): StyleRule[] => rulesFor(css, className, options).filter(isDarkRule);

const lightRule = (
  css: string,
  className: string,
  options?: CompilerOptions,
): StyleRule => {
  const rule = rulesFor(css, className, options).find(
    (candidate) => !isDarkRule(candidate),
  );

  if (!rule) {
    throw new Error(`No unconditional rule for .${className}`);
  }

  return rule;
};

/**
 * The style properties a rule sets. A declaration is either a static record of
 * property/value pairs or a `[value, propertyPath]` tuple, and both forms
 * appear in the same list.
 */
const declaredProperties = (rule: StyleRule): string[] => {
  return (rule.d ?? []).flatMap((declaration: StyleDeclaration) => {
    if (Array.isArray(declaration)) {
      const propertyPath = declaration[1];
      return typeof propertyPath === "string"
        ? [propertyPath]
        : [propertyPath.join(".")];
    }

    return Object.keys(declaration);
  });
};

/** The value a rule sets for a property, in whichever declaration form it took. */
const declaredValue = (
  rule: StyleRule,
  property: string,
): StyleDescriptor | undefined => {
  for (const declaration of rule.d ?? []) {
    if (Array.isArray(declaration)) {
      const propertyPath = declaration[1];
      const name =
        typeof propertyPath === "string"
          ? propertyPath
          : propertyPath.join(".");

      if (name === property) {
        return declaration[0];
      }
    } else if (property in declaration) {
      return declaration[property];
    }
  }

  return undefined;
};

const variable = (
  rule: StyleRule,
  name: string,
): StyleDescriptor | undefined => {
  return rule.v?.find(([variableName]) => variableName === name)?.[1];
};

describe("an extra rule carries only its own declaration", () => {
  /**
   * A `var()` anywhere inside `light-dark()` keeps the colour unresolved, which
   * is the path that opens the extra rule from the current rule rather than
   * from an empty one. Two such declarations on one rule is the trigger: a
   * colour and a background colour together is ordinary in a themed stylesheet.
   */
  const twoUnresolvedDeclarations = `
.p1 {
  color: light-dark(hsl(0 100% 50% / var(--a)), hsl(240 100% 50% / var(--a)));
  background-color: light-dark(hsl(120 100% 25% / var(--a)), hsl(60 100% 50% / var(--a)));
}`;

  test("each declaration opens one dark rule", () => {
    expect(darkRules(twoUnresolvedDeclarations, "p1")).toHaveLength(2);
  });

  test("a dark rule sets the properties of its own declaration, and no others", () => {
    expect(
      darkRules(twoUnresolvedDeclarations, "p1").map(declaredProperties),
    ).toStrictEqual([["color"], ["backgroundColor"]]);
  });

  test("the second declaration's dark rule does not re-assert the first's light value", () => {
    const [, backgroundDarkRule] = darkRules(twoUnresolvedDeclarations, "p1");

    expect(backgroundDarkRule?.d).toStrictEqual([
      [[{}, "hsl", [60, 100, 50, [{}, "var", "a", 1]]], "backgroundColor", 1],
    ]);
  });
});

describe("an extra rule carries its own flags", () => {
  /**
   * Only the dark branch reads a variable, so `dv` is the extra rule's own — the
   * rule it copies has no delayed declaration to inherit the flag from.
   */
  const darkBranchVariable = `.p2 { background-color: light-dark(red, var(--d)); }`;

  test("the light rule needs no delayed resolution", () => {
    expect(lightRule(darkBranchVariable, "p2").dv).toBeUndefined();
  });

  test("the dark rule declares delayed resolution for its own variable", () => {
    expect(darkRules(darkBranchVariable, "p2")).toHaveLength(1);
    expect(darkRules(darkBranchVariable, "p2")[0]?.dv).toBe(1);
  });
});

describe("an extra rule publishes its own inherited colour", () => {
  const lightDarkColor = `.p3 { color: light-dark(red, blue); }`;

  test("the light rule publishes the light colour", () => {
    expect(variable(lightRule(lightDarkColor, "p3"), "__rn-css-color")).toBe(
      "#f00",
    );
  });

  /**
   * Stated over every dark rule rather than over a count of them, because how
   * many parses a colour declaration takes is not this rule's subject — that a
   * dark rule never hands descendants the light colour is.
   */
  test("no dark rule publishes the light colour", () => {
    const published = darkRules(lightDarkColor, "p3").map((rule) =>
      variable(rule, "__rn-css-color"),
    );

    expect(published.length).toBeGreaterThan(0);
    expect(published).not.toContain("#f00");
  });

  test("a dark rule publishes the dark colour", () => {
    const published = darkRules(lightDarkColor, "p3").map((rule) =>
      variable(rule, "__rn-css-color"),
    );

    expect(published).toContain("#00f");
  });

  /**
   * A `var()` in either branch keeps the whole declaration unparsed, which
   * publishes the variable from a different place than the parsed colour path.
   */
  const unresolvedLightDarkColor = `.p4 { color: light-dark(red, var(--d)); }`;

  test("an unresolved dark branch publishes itself, not the light colour", () => {
    const published = darkRules(unresolvedLightDarkColor, "p4").map((rule) =>
      variable(rule, "__rn-css-color"),
    );

    expect(published).toStrictEqual([[{}, "var", "d", 1]]);
  });
});

describe("an extra rule leaves the rest of the rule alone", () => {
  const withOtherVariable = `.p5 { --other: 5px; color: light-dark(red, blue); }`;
  // The variable has to survive compilation to be observable in the output.
  const keepVariables: CompilerOptions = { inlineVariables: false };

  test("the light rule publishes both variables", () => {
    expect(lightRule(withOtherVariable, "p5", keepVariables).v).toStrictEqual([
      ["other", 5],
      ["__rn-css-color", "#f00"],
    ]);
  });

  /**
   * The rule an extra rule copies matches under the extra condition too, so a
   * variable the extra rule does not restate still reaches the element from
   * there. Restating it would make every extra rule a second place the value is
   * written.
   */
  test("a dark rule restates only the variable it changes", () => {
    const rules = darkRules(withOtherVariable, "p5", keepVariables);

    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule.v).toStrictEqual([["__rn-css-color", "#00f"]]);
    }
  });
});

describe("an extra rule publishes nothing it does not change", () => {
  /**
   * Two `light-dark()` declarations open two extra rules on one rule, and only
   * one of them publishes a colour — `background-color` is not inherited. The
   * other is applied last, so anything it restates from the rule it copies
   * overwrites what the first one published.
   */
  const resolved = `
.p6 {
  color: light-dark(red, blue);
  background-color: light-dark(#0f0, #ff0);
}`;

  /**
   * A `var()` in either branch keeps the colour unresolved, which publishes the
   * variable from a different place than the parsed colour path — so the same
   * invariant is stated over both.
   */
  const unresolved = `
.p7 {
  color: light-dark(hsl(0 100% 50% / var(--a)), hsl(240 100% 50% / var(--a)));
  background-color: light-dark(hsl(120 100% 25% / var(--a)), hsl(60 100% 50% / var(--a)));
}`;

  test.each([
    ["a parsed colour", resolved, "p6"],
    ["an unresolved colour", unresolved, "p7"],
  ])("%s: no dark rule republishes the light colour", (_, css, className) => {
    const published = darkRules(css, className).map((rule) =>
      variable(rule, "__rn-css-color"),
    );

    expect(published.length).toBeGreaterThan(0);
    // Structural, not identity: an unresolved colour publishes an object.
    expect(published).not.toContainEqual(
      variable(lightRule(css, className), "__rn-css-color"),
    );
  });

  test.each([
    ["a parsed colour", resolved, "p6"],
    ["an unresolved colour", unresolved, "p7"],
  ])(
    "%s: the background's dark rule publishes nothing at all",
    (_, css, className) => {
      const backgroundDarkRule = darkRules(css, className).find((rule) =>
        declaredProperties(rule).includes("backgroundColor"),
      );

      expect(backgroundDarkRule).toBeDefined();
      expect(backgroundDarkRule?.v).toBeUndefined();
    },
  );

  test("a parsed colour: a dark rule publishes the dark colour", () => {
    const published = darkRules(resolved, "p6").map((rule) =>
      variable(rule, "__rn-css-color"),
    );

    expect(published).toContain("#00f");
  });
});

describe("an extra rule is scoped to the pseudo-element its rule was", () => {
  /**
   * `::selection` maps `color` onto `selectionColor`, `::placeholder` onto
   * `placeholderTextColor`. The mapping is applied to the rule on its way to
   * the selector, so an extra rule composed after that step is a declaration
   * the pseudo-element asked for landing on the element itself.
   */
  const pseudoElements = [
    ["::selection", "selectionColor"],
    ["::placeholder", "placeholderTextColor"],
  ] as const;

  test.each(pseudoElements)(
    "%s: every rule sets %s, and no rule sets color",
    (pseudoElement, property) => {
      const css = `.p8${pseudoElement} { color: light-dark(red, blue); }`;
      const rules = rulesFor(css, "p8");

      expect(rules.length).toBeGreaterThan(0);
      for (const rule of rules) {
        expect(declaredProperties(rule)).toStrictEqual([property]);
      }
    },
  );

  test.each(pseudoElements)(
    "%s: the dark rule sets %s to the dark colour",
    (pseudoElement, property) => {
      const css = `.p8${pseudoElement} { color: light-dark(red, blue); }`;

      expect(declaredValue(lightRule(css, "p8"), property)).toBe("#f00");

      const dark = darkRules(css, "p8");
      expect(dark.length).toBeGreaterThan(0);
      for (const rule of dark) {
        expect(declaredValue(rule, property)).toBe("#00f");
      }
    },
  );
});

describe("an extra rule matches where the rule it was opened on matched", () => {
  /**
   * The rule an extra rule is opened on supplies the conditions it already
   * matched under, and the extra rule adds its own to them. A dark rule that
   * dropped one of them applies where the declaration it carries never
   * appeared — outside the container, or at any width.
   */
  const inContainer = `@container box (min-width: 100px) { .p10 { color: light-dark(red, blue); } }`;

  test("the dark rule is scoped to the container its rule was", () => {
    const containerQuery = lightRule(inContainer, "p10").cq;
    const dark = darkRules(inContainer, "p10");

    expect(containerQuery?.length).toBeGreaterThan(0);
    expect(dark.length).toBeGreaterThan(0);
    for (const rule of dark) {
      expect(rule.cq).toStrictEqual(containerQuery);
    }
  });

  const inMediaQuery = `@media (min-width: 100px) { .p11 { color: light-dark(red, blue); } }`;

  test("the dark rule adds its condition to the ones its rule already carried", () => {
    const mediaConditions = lightRule(inMediaQuery, "p11").m;
    const dark = darkRules(inMediaQuery, "p11");

    expect(mediaConditions?.length).toBeGreaterThan(0);
    expect(dark.length).toBeGreaterThan(0);
    for (const rule of dark) {
      expect(rule.m).toStrictEqual([
        ...(mediaConditions ?? []),
        ["=", "prefers-color-scheme", "dark"],
      ]);
    }
  });
});

describe("an extra rule matches under the conditions of its selector", () => {
  /**
   * A pseudo class and an attribute query describe the SELECTOR rather than the
   * rule, so they reach every rule the selector applies to — an extra rule has
   * no copy of its own to carry, and needs none.
   */
  const withPseudoClass = `.p12:hover { color: light-dark(red, blue); }`;

  test("the dark rule carries the pseudo class its selector named", () => {
    const pseudoClasses = lightRule(withPseudoClass, "p12").p;
    const dark = darkRules(withPseudoClass, "p12");

    expect(Object.keys(pseudoClasses ?? {}).length).toBeGreaterThan(0);
    expect(dark.length).toBeGreaterThan(0);
    for (const rule of dark) {
      expect(rule.p).toStrictEqual(pseudoClasses);
    }
  });

  const withAttributeQuery = `.p13[data-x="1"] { color: light-dark(red, blue); }`;

  test("the dark rule carries the attribute query its selector named", () => {
    const attributeQuery = lightRule(withAttributeQuery, "p13").aq;
    const dark = darkRules(withAttributeQuery, "p13");

    expect(attributeQuery?.length).toBeGreaterThan(0);
    expect(dark.length).toBeGreaterThan(0);
    for (const rule of dark) {
      expect(rule.aq).toStrictEqual(attributeQuery);
    }
  });
});

describe("a container query names its parent classes once per selector", () => {
  /**
   * The parent classes a container query names describe the SELECTOR, not the
   * rule, so how many rules the selector receives cannot change how many times
   * they are registered. Every `light-dark()` declaration adds one more rule,
   * and the registration is the same either way.
   */
  const oneRule = `.p14-container .p14 { color: red; }`;
  const manyRules = `
.p14-container .p14 {
  color: light-dark(red, blue);
  background-color: light-dark(green, yellow);
  border-top-color: light-dark(cyan, magenta);
}`;

  test("every light-dark() declaration adds a rule to the selector", () => {
    expect(rulesFor(oneRule, "p14")).toHaveLength(1);
    expect(rulesFor(manyRules, "p14").length).toBeGreaterThan(
      rulesFor(oneRule, "p14").length,
    );
  });

  test("the container class is registered once, whatever the selector receives", () => {
    expect(rulesFor(manyRules, "p14-container")).toHaveLength(1);
    expect(rulesFor(manyRules, "p14-container")).toStrictEqual(
      rulesFor(oneRule, "p14-container"),
    );
  });
});

describe("a light-dark() declaration opens one extra rule", () => {
  /**
   * `color` writes twice — the style property, and the variable it publishes to
   * its subtree — and `parseColor` is not pure: a `light-dark()` value opens an
   * extra rule. Parsing the value once for both writes is what keeps a colour
   * declaration to one dark rule.
   *
   * A shorthand parses its value once per longhand it expands to, so it opens
   * one extra rule per parse: `border-color` emits four identical dark rules,
   * `border-inline-color` and `border-block-color` two each. Same impurity, a
   * different caller, and not what this describe measures.
   */
  test.each([
    ["color", `.p9 { color: light-dark(red, blue); }`],
    ["background-color", `.p9 { background-color: light-dark(red, blue); }`],
  ])("%s", (_, css) => {
    expect(darkRules(css, "p9")).toHaveLength(1);
  });
});
