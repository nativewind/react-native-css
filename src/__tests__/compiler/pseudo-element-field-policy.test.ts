import { compile } from "react-native-css/compiler";

import type { StyleRule } from "../../compiler/compiler.types";
import {
  compilerVariablePrefix,
  pseudoElementFieldPolicy,
  scopeRuleToPseudoElement,
} from "../../compiler/pseudo-elements";

test("every custom property the compiler mints carries the prefix the report filters on", () => {
  // Renaming the namespace at either end turns this red instead of leaving the report to name
  // the compiler's own variables on every pseudo-element rule that sets one
  const minted = (
    compile(`.a { color: #ff0000; font-size: 40px; direction: rtl; }`)
      .stylesheet()
      .s?.find(([name]) => name === "a")?.[1] ?? []
  )
    .flatMap((rule) => rule.v ?? [])
    .map(([name]) => name);

  expect(minted.length).toBeGreaterThan(0);
  expect(
    minted.filter((name) => !name.startsWith(compilerVariablePrefix)),
  ).toStrictEqual([]);
});

describe("field policy", () => {
  const policyFields = Object.keys(pseudoElementFieldPolicy).filter(
    (key): key is keyof typeof pseudoElementFieldPolicy =>
      key in pseudoElementFieldPolicy,
  );

  test("the policy classifies at least one field of each kind", () => {
    for (const kind of ["selector", "rebuilt", "dropped"] as const) {
      expect(
        policyFields.filter(
          (field) => pseudoElementFieldPolicy[field] === kind,
        ),
      ).not.toStrictEqual([]);
    }
  });

  test("a selector field is carried over and a dropped field never is", () => {
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
          break;
      }
    }
  });
});
