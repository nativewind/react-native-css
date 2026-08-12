import { compile } from "react-native-css/compiler";

import type { StyleRule } from "../../compiler/compiler.types";

const rulesFor = (css: string, className: string): StyleRule[] => {
  const result = compile(css).stylesheet();
  return (result.s?.find(([name]) => name === className)?.[1] ??
    []) as StyleRule[];
};

/**
 * A pseudo-element's declarations are scoped to the pseudo-element. The
 * compiler maps ONE declaration onto a React Native prop; every other one must
 * be DROPPED, not returned unchanged — returning it applies a `::selection`
 * declaration to the real element.
 */
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
    // `color` inside ::selection is the selected TEXT colour, which React
    // Native cannot express — mapping it to `selectionColor` would invert its
    // meaning, so it is dropped rather than re-targeted.
    const rules = rulesFor(`.a::selection { color: #ff0000; }`, "a");

    expect(rules[0]?.d ?? []).toStrictEqual([]);
  });

  test("a plain rule on the same class is untouched", () => {
    // The control an over-broad fix breaks: only the pseudo-element's own
    // declarations are scoped away.
    // A plain rule keeps the static object form the compiler emits for it.
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
