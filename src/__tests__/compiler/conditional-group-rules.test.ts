import { compile, type StyleRule } from "react-native-css/compiler";

/**
 * Returns every rule the compiler emitted for `.child`.
 *
 * A conditional group rule (`@media`, `@container`) contributes its inner
 * rules to this list; if the block is skipped the list is empty.
 */
function compileChildRules(css: string): StyleRule[] {
  const stylesheet = compile(css).stylesheet();

  return (
    stylesheet.s?.flatMap(([className, ruleSet]) => {
      return className === "child" ? ruleSet : [];
    }) ?? []
  );
}

/**
 * Conditions this compiler cannot evaluate, one per reason it cannot.
 *
 * A block guarded by one of these can never be shown to match, so it must not
 * be emitted. Each case is also a vacuity guard on the case above it: if
 * support for one of these lands, its `m`/`cq` stops being absent and the test
 * fails, which is the signal to move the case rather than delete it.
 */
const uncompilable: [label: string, css: string][] = [
  [
    "a container style() query",
    "@container style(--foo: bar) { .child { color: red } }",
  ],
  [
    "a container feature value the compiler cannot resolve",
    "@container (width > env(safe-area-inset-top)) { .child { color: red } }",
  ],
  [
    "a media feature value the compiler cannot resolve",
    "@media (width > env(safe-area-inset-top)) { .child { color: red } }",
  ],
  [
    "a negated media condition the compiler cannot resolve",
    "@media not (width > env(safe-area-inset-top)) { .child { color: red } }",
  ],
];

describe("a block whose condition does not compile is not emitted", () => {
  test.each(uncompilable)("%s", (_label, css) => {
    // Emitting the rule with no condition is worse than emitting nothing: the
    // declarations then apply to every element that carries the class, which
    // is the opposite of what the author wrote.
    expect(compileChildRules(css)).toStrictEqual([]);
  });
});

describe("a block whose condition does compile is emitted", () => {
  /**
   * The control for the table above — without it, a compiler that emitted
   * nothing at all would pass every case there.
   */
  const cases: [label: string, css: string][] = [
    ["@container", "@container (width > 400px) { .child { color: red } }"],
    ["@media", "@media (width > 400px) { .child { color: red } }"],
    ["@media all", "@media all { .child { color: red } }"],
    ["@media screen", "@media screen { .child { color: red } }"],
    [
      "@media not print",
      "@media not print and (width > 400px) { .child { color: red } }",
    ],
    [
      "a media query list with one uncompilable branch",
      "@media (width > env(safe-area-inset-top)), (width > 400px) { .child { color: red } }",
    ],
  ];

  test.each(cases)("%s", (_label, css) => {
    expect(compileChildRules(css)).toHaveLength(1);
  });
});
