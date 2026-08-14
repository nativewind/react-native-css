import { compile } from "react-native-css/compiler";

import type { StyleRule } from "../../compiler/compiler.types";

const rulesFor = (css: string, className: string): StyleRule[] => {
  const result = compile(css).stylesheet();
  return (result.s?.find(([name]) => name === className)?.[1] ??
    []) as StyleRule[];
};

// The compiler maps one declaration onto a React Native prop and drops the rest;
// returning an unmapped one applies a ::selection declaration to the real element
describe("::selection", () => {
  test("background-color maps to selectionColor", () => {
    const rules = rulesFor(`.a::selection { background-color: #ff0000; }`, "a");

    expect(rules[0]?.d).toStrictEqual([["#f00", ["selectionColor"]]]);
  });

  test("an unmapped declaration is dropped, not applied to the element", () => {
    const rules = rulesFor(`.a::selection { width: 10px; }`, "a");

    expect(rules[0]?.d ?? []).toStrictEqual([]);
  });

  test("an unmapped declaration beside a mapped one is still dropped", () => {
    const rules = rulesFor(
      `.a::selection { background-color: #ff0000; width: 10px; }`,
      "a",
    );

    expect(rules[0]?.d).toStrictEqual([["#f00", ["selectionColor"]]]);
  });

  test("color does not paint the element", () => {
    // color here is the selected TEXT colour, which React Native cannot express;
    // mapping it to selectionColor would invert its meaning
    const rules = rulesFor(`.a::selection { color: #ff0000; }`, "a");

    expect(rules[0]?.d ?? []).toStrictEqual([]);
  });

  test("a plain rule on the same class is untouched", () => {
    // The control an over-broad fix breaks: only a pseudo-element's own declarations
    // are scoped away, and a plain rule keeps the static object form
    const rules = rulesFor(`.a { background-color: #ff0000; }`, "a");

    expect(rules[0]?.d).toStrictEqual([{ backgroundColor: "#f00" }]);
  });
});

describe("::placeholder", () => {
  test("color maps to placeholderTextColor", () => {
    const rules = rulesFor(`.a::placeholder { color: #ff0000; }`, "a");

    expect(rules[0]?.d).toStrictEqual([["#f00", ["placeholderTextColor"]]]);
  });

  test("an unmapped declaration is dropped, not applied to the element", () => {
    const rules = rulesFor(
      `.a::placeholder { background-color: #ff0000; }`,
      "a",
    );

    expect(rules[0]?.d ?? []).toStrictEqual([]);
  });
});
