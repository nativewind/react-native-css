import { compile, type CompilerOptions } from "react-native-css/compiler";
import { COLOR_SCHEME_VARIABLE } from "react-native-css/utilities";

import type { StyleRule } from "../../compiler/compiler.types";

const inlineVariablesOff = { inlineVariables: false } as const;

const rulesFor = (
  css: string,
  className = "a",
  options: CompilerOptions = {},
): StyleRule[] =>
  compile(css, options)
    .stylesheet()
    .s?.find(([name]) => name === className)?.[1] ?? [];

const readLightDark = (value: unknown): unknown =>
  Array.isArray(value)
    ? value[1] === "lightDark"
      ? value[2]
      : value.map(readLightDark).find((found) => found !== undefined)
    : undefined;

// CSS Color 5 §7: light-dark() is one value with two arms, resolved against the used colour scheme
describe("light-dark() compiles to one value", () => {
  test.each([
    ["color", "color: light-dark(#123456, #654321)"],
    ["background-color", "background-color: light-dark(#123456, #654321)"],
    ["a border colour", "border: 1px solid light-dark(#123456, #654321)"],
    ["a shadow colour", "box-shadow: 0 0 1px light-dark(#123456, #654321)"],
    [
      "a text shadow colour",
      "text-shadow: 1px 1px 1px light-dark(#123456, #654321)",
    ],
    ["a custom property", "--x: light-dark(#123456, #654321)"],
  ])("%s gets one rule holding both colours", (_name, declaration) => {
    const rules = rulesFor(`.a { ${declaration}; }`, "a", inlineVariablesOff);

    expect(rules).toHaveLength(1);
    expect(rules[0]?.m).toBeUndefined();
    expect(readLightDark([rules[0]?.d, rules[0]?.v])).toStrictEqual([
      "#123456",
      "#654321",
    ]);
  });

  test("a colour publishes the same value to its subtree", () => {
    const [rule] = rulesFor(`.a { color: light-dark(#123456, #654321); }`);

    expect(rule?.v).toStrictEqual([
      ["__rn-css-color", [{}, "lightDark", ["#123456", "#654321"]]],
    ]);
  });

  test("a :root custom property keeps both colours", () => {
    expect(
      compile(
        `:root { --x: light-dark(#123456, #654321); }`,
        inlineVariablesOff,
      ).stylesheet().vr,
    ).toStrictEqual([["x", [[[{}, "lightDark", ["#123456", "#654321"]]]]]]);
  });

  test("a branch that reads a variable delays the declaration", () => {
    const [rule] = rulesFor(
      `.a { color: light-dark(#123456, var(--d)); }`,
      "a",
      inlineVariablesOff,
    );

    expect(rule?.dv).toBe(1);
    expect(readLightDark(rule?.d)).toStrictEqual([
      "#123456",
      [{}, "var", "d", 1],
    ]);
  });

  test("a media query keeps only its own condition", () => {
    expect(
      rulesFor(
        `@media (min-width: 100px) { .a { color: light-dark(#123456, #654321); } }`,
      ).map((rule) => rule.m),
    ).toStrictEqual([[[">=", "width", 100]]]);
  });

  test("a pseudo-element maps it to its prop", () => {
    expect(
      rulesFor(`.a::placeholder { color: light-dark(#123456, #654321); }`).map(
        (rule) => rule.d,
      ),
    ).toStrictEqual([
      [
        [
          [{}, "lightDark", ["#123456", "#654321"]],
          ["placeholderTextColor"],
          1,
        ],
      ],
    ]);
  });

  test.each([
    "light-dark(canvastext, #654321)",
    "light-dark(#123456, canvastext)",
  ])("%s drops the declaration as the colour it cannot paint does", (value) => {
    expect(
      rulesFor(`.a { color: light-dark(#123456, #654321); }`),
    ).not.toStrictEqual([]);
    expect(rulesFor(`.a { color: ${value}; }`)).toStrictEqual(
      rulesFor(`.a { color: canvastext; }`),
    );
  });
});

test("a light-dark() declaration reads the element's colour scheme", () => {
  const [rule] = rulesFor(`.a { color: light-dark(#123456, #654321); }`);

  expect(rule?.dv).toBe(1);
});

// CSS Color Adjust 1 §2.2: color-scheme publishes the schemes it supports to its subtree and renders nothing of its own
describe("color-scheme", () => {
  test.each([
    ["normal", "normal"],
    ["light", "light"],
    ["dark", "dark"],
    ["light dark", "light dark"],
    ["dark light", "light dark"],
    ["only light", "light"],
    ["only dark", "dark"],
    ["only light dark", "light dark"],
    ["brand", "normal"],
    ["brand dark", "dark"],
  ])("color-scheme: %s publishes %s", (value, support) => {
    const compiled = compile(`.a { color-scheme: ${value}; }`);

    expect(compiled.stylesheet()).toStrictEqual({
      s: [["a", [{ s: [1, 1], v: [[COLOR_SCHEME_VARIABLE, support]] }]]],
    });
    expect(compiled.warnings()).toStrictEqual({});
  });

  test.each([
    ["var(--scheme)", [{}, "var", "scheme", 1]],
    ["var(--scheme, dark)", [{}, "var", ["scheme", "dark"], 1]],
  ])("color-scheme: %s publishes the reference", (value, reference) => {
    expect(
      rulesFor(`.a { color-scheme: ${value}; }`, "a", inlineVariablesOff),
    ).toStrictEqual([{ s: [1, 1], v: [[COLOR_SCHEME_VARIABLE, reference]] }]);
  });

  test("a :root color-scheme reaches every element", () => {
    expect(
      compile(`:root { color-scheme: light dark; }`).stylesheet().vr,
    ).toStrictEqual([[COLOR_SCHEME_VARIABLE, [["light dark"]]]]);
  });
});
