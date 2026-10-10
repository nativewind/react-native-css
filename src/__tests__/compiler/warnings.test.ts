import { compile } from "react-native-css/compiler";

function ruleNames(css: string) {
  return compile(css)
    .stylesheet()
    .s?.map(([name]) => name);
}

describe("the syntax channel", () => {
  test("an unknown at-rule drops the rules inside it, and says so", () => {
    const css = `@unknown-thing { .b { color: blue } }\n.c { color: green }`;

    expect(ruleNames(css)).toStrictEqual(["c"]);
    expect(compile(css).warnings()).toStrictEqual({
      syntax: ["Unknown at rule: @unknown-thing"],
    });
  });

  test("an unrecognised pseudo-element drops its rule, and says so", () => {
    const css = `.a::wat { color: red }\n.c { color: green }`;

    expect(ruleNames(css)).toStrictEqual(["c"]);
    expect(compile(css).warnings()).toStrictEqual({
      syntax: [
        "'wat' is not recognized as a valid pseudo-element. Did you mean ':wat' (pseudo-class) or is this a typo?",
      ],
    });
  });

  test("the same shape spelled correctly keeps both rules and warns nothing", () => {
    const css = `@media (min-width: 1px) { .b { color: blue } }\n.c { color: green }`;

    expect(ruleNames(css)).toStrictEqual(["b", "c"]);
    expect(compile(css).warnings()).toStrictEqual({});
  });

  test.each([
    "@nativeMapping {}",
    ".a { @nativeMapping { color: textColor; } color: red }",
  ])("this package's own at-rule is not reported: %s", (css) => {
    expect(compile(css).warnings()).toStrictEqual({});
  });

  test("a repeated mistake is one entry, and two different ones are two", () => {
    expect(
      compile(`@unknown-a { .x { color: red } }
@unknown-a { .y { color: blue } }`).warnings().syntax,
    ).toStrictEqual(["Unknown at rule: @unknown-a"]);

    expect(
      compile(`@unknown-a { .x { color: red } }
@unknown-b { .y { color: blue } }`).warnings().syntax,
    ).toStrictEqual([
      "Unknown at rule: @unknown-a",
      "Unknown at rule: @unknown-b",
    ]);
  });
});

// float rather than a property React Native may yet gain: Yoga lays out flexbox and has no floats
test("a property with no React Native equivalent is reported on its own channel", () => {
  expect(compile(`.a { float: left }`).warnings()).toStrictEqual({
    properties: ["float"],
  });
});
