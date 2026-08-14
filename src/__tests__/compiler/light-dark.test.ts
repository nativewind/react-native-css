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
