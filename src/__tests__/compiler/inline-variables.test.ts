import { compileWithAutoDebug } from "react-native-css/jest";

/**
 * `inline-variables.ts` folds a custom property that the stylesheet declares
 * exactly once into the declaration that reads it, and drops the variable.
 *
 * That is a compile-time optimisation with a runtime consequence worth pinning:
 * a folded property performs no `var()` lookup on device, so any test that
 * asserts how two declarations of the same name are ORDERED passes without ever
 * reaching the code that orders them. The precedence tests in
 * `src/__tests__/native/variables.test.tsx` and `vars.test.tsx` all declare the
 * name more than once for this reason, and this file is what makes that
 * requirement visible instead of folklore: change the folding rule and these go
 * red, rather than the runtime suites going quietly vacuous.
 */

/** The compiled rules for one class, or a throw naming the class that is missing. */
const rulesFor = (css: string, className: string) => {
  const stylesheet = compileWithAutoDebug(css).stylesheet();
  const rules = stylesheet.s?.find((rule) => rule[0] === className)?.[1];

  if (!rules) {
    throw new Error(`No rule found for .${className}`);
  }

  return rules;
};

/** The names a rule declares for itself, ignoring the compiler's own channels. */
const authoredVariableNames = (css: string, className: string) =>
  rulesFor(css, className)
    .flatMap((rule) => (typeof rule === "object" ? (rule.v ?? []) : []))
    .map(([name]) => name)
    .filter((name) => !name.startsWith("__rn-css-"));

/** True when the rule still has to resolve a `var()` at runtime. */
const readsAVariableAtRuntime = (css: string, className: string) =>
  rulesFor(css, className).some(
    (rule) => typeof rule === "object" && rule.dv === 1,
  );

const CONSUMER = `.consumer { color: var(--my-var); }`;
const OWN = `.own { --my-var: blue; color: var(--my-var); }`;
const SECOND_DEFINITION = `.elsewhere { --my-var: seed; }`;

test("a singly-declared custom property is folded into the declaration that reads it", () => {
  // The whole rule, so the fold is visible as a fact rather than an inference:
  // `color` holds the computed value and the rule declares no `--my-var` to
  // resolve. Nothing here reaches `varResolver` on device.
  expect(rulesFor(OWN, "own")).toStrictEqual([
    { s: [1, 1], d: [{ color: "#00f" }], v: [["__rn-css-color", "#00f"]] },
  ]);
  expect(authoredVariableNames(OWN, "own")).toStrictEqual([]);
  expect(readsAVariableAtRuntime(OWN, "own")).toBe(false);
});

test("a second declaration anywhere in the sheet defeats the fold", () => {
  const css = `${SECOND_DEFINITION} ${OWN}`;

  // Same rule, same authored CSS — and now the element carries its own
  // `--my-var` and a `var()` the runtime has to resolve against it. This is the
  // shape every precedence test needs.
  expect(authoredVariableNames(css, "own")).toStrictEqual(["my-var"]);
  expect(readsAVariableAtRuntime(css, "own")).toBe(true);
});

test("a rule that only reads a custom property declares none of its own", () => {
  // The other side of the cascade: this element has no declared value, so the
  // inherited one is the only candidate and the runtime must go looking for it.
  expect(authoredVariableNames(CONSUMER, "consumer")).toStrictEqual([]);
  expect(readsAVariableAtRuntime(CONSUMER, "consumer")).toBe(true);
});

test("declaring and reading in separate rules leaves both halves in the sheet", () => {
  // How the multi-rule form encodes, since `variables.test.tsx` composes its
  // trees this way: the declaration rides the declaring rule and the `var()`
  // rides the reading one.
  const css = `${SECOND_DEFINITION} .declares { --my-var: blue; } ${CONSUMER}`;

  expect(authoredVariableNames(css, "declares")).toStrictEqual(["my-var"]);
  expect(readsAVariableAtRuntime(css, "declares")).toBe(false);
  expect(authoredVariableNames(css, "consumer")).toStrictEqual([]);
  expect(readsAVariableAtRuntime(css, "consumer")).toBe(true);
});
