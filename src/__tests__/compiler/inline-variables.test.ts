import { compileWithAutoDebug } from "react-native-css/jest";

// The inliner folds a property declared once, so a precedence test declares it twice to reach the runtime

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
  expect(rulesFor(OWN, "own")).toStrictEqual([
    { s: [1, 1], d: [{ color: "#00f" }], v: [["__rn-css-color", "#00f"]] },
  ]);
  expect(authoredVariableNames(OWN, "own")).toStrictEqual([]);
  expect(readsAVariableAtRuntime(OWN, "own")).toBe(false);
});

test("a second declaration anywhere in the sheet defeats the fold", () => {
  const css = `${SECOND_DEFINITION} ${OWN}`;

  expect(authoredVariableNames(css, "own")).toStrictEqual(["my-var"]);
  expect(readsAVariableAtRuntime(css, "own")).toBe(true);
});

test("a rule that only reads a custom property declares none of its own", () => {
  expect(authoredVariableNames(CONSUMER, "consumer")).toStrictEqual([]);
  expect(readsAVariableAtRuntime(CONSUMER, "consumer")).toBe(true);
});

test("declaring and reading in separate rules leaves both halves in the sheet", () => {
  const css = `${SECOND_DEFINITION} .declares { --my-var: blue; } ${CONSUMER}`;

  expect(authoredVariableNames(css, "declares")).toStrictEqual(["my-var"]);
  expect(readsAVariableAtRuntime(css, "declares")).toBe(false);
  expect(authoredVariableNames(css, "consumer")).toStrictEqual([]);
  expect(readsAVariableAtRuntime(css, "consumer")).toBe(true);
});
