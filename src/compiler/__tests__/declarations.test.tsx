import { compile } from "../compiler";

const tests = [
  ["caret-color: black", [{ d: [["#000", ["cursorColor"]]], s: [1, 1] }]],
  ["stroke: black;", [{ d: [["#000", ["stroke"]]], s: [1, 1] }]],
] as const;

test.each(tests)("declarations for %s", (declarations, expected) => {
  const compiled = compile(`.my-class { ${declarations} }`);

  const stylesheet = compiled.stylesheet();

  const myClassDeclarations = stylesheet.s?.find(
    (rule) => rule[0] === "my-class",
  )?.[1];

  if (!myClassDeclarations) {
    throw new Error("No rule found for .my-class");
  }

  expect(myClassDeclarations).toStrictEqual(expected);
});
