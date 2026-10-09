import type { StyleRule } from "../../compiler/compiler.types";
import {
  pseudoElementFieldPolicy,
  scopeRuleToPseudoElement,
} from "../../compiler/pseudo-elements";

const policyFields = Object.keys(pseudoElementFieldPolicy).filter(
  (key): key is keyof typeof pseudoElementFieldPolicy =>
    key in pseudoElementFieldPolicy,
);

test("the policy classifies at least one field of each kind", () => {
  for (const kind of ["carried", "rebuilt", "dropped"] as const) {
    expect(
      policyFields.filter((field) => pseudoElementFieldPolicy[field] === kind),
    ).not.toStrictEqual([]);
  }
});

test("a carried field is kept, a rebuilt one is the pseudo-element's and a dropped one is gone", () => {
  const populated: StyleRule = {
    s: [1, 1],
    d: [["#f00", "backgroundColor"]],
    v: [["brand", "#f00"]],
    c: ["c:foo"],
    pe: "placeholder",
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
      case "carried":
        expect(scoped).toHaveProperty(field, populated[field]);
        break;
      case "dropped":
        expect(scoped).not.toHaveProperty(field);
        break;
      case "rebuilt":
        expect(scoped?.[field]).not.toStrictEqual(populated[field]);
        break;
    }
  }
});
