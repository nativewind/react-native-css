import { compile } from "react-native-css/compiler";

const declarationsFor = (css: string, className: string) => {
  const rules = new Map(compile(css).stylesheet().s ?? []).get(className);

  return (rules ?? []).flatMap((rule) => rule.d ?? []);
};

test("a literal font-family stack narrows to its first family", () => {
  // React Native's fontFamily is one family, not a stack. parseFontFamily takes
  // value.family[0], so the narrowing happens here and never reaches the runtime
  expect(
    declarationsFor(`.a { font-family: Inter, Helvetica, sans-serif; }`, "a"),
  ).toStrictEqual([{ fontFamily: "Inter" }]);
});

test("a var()-valued font-family reaches the runtime unnarrowed", () => {
  // The counterpart the runtime has to handle: the compiler emits a var reference,
  // so parseFontFamily never sees the stack. --stack is declared twice because a
  // single-definition variable is inlined and would be narrowed here after all
  expect(
    declarationsFor(
      `:root { --stack: Inter, Helvetica; } .other { --stack: Georgia, serif; } .a { font-family: var(--stack); }`,
      "a",
    ),
  ).toStrictEqual([[[{}, "var", "stack", 1], "fontFamily", 1]]);
});
