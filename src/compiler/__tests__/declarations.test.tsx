import { compileWithAutoDebug } from "react-native-css/jest";

// prettier-ignore
const tests = [
  ["-rn-ripple-color: black;", [{ d: [["black", ["android_ripple", "color"]]], s: [1, 1] }]],
  ["-rn-ripple-style: borderless;", [{ d: [[true, ["android_ripple", "borderless"]]], s: [1, 1] }]],
  ["caret-color: black", [{ d: [["#000", ["cursorColor"]]], s: [1, 1] }]],
  ["stroke: black;", [{ d: [["#000", ["stroke"]]], s: [1, 1] }]],
  ["rotate: 3deg;", [{ d: [[[{}, "rotateZ", "3deg"], "rotateZ"]], s: [1, 1] }]],
  ["rotate: x 3deg;", [{ d: [[[{}, "rotateX", "3deg"], "rotateX"]], s: [1, 1] }]],
] as const;

test.each(tests)("declarations for %s", (declarations, expected) => {
  const compiled = compileWithAutoDebug(`.my-class { ${declarations} }`);

  const stylesheet = compiled.stylesheet();

  const myClassDeclarations = stylesheet.s?.find(
    (rule) => rule[0] === "my-class",
  )?.[1];

  if (!myClassDeclarations) {
    throw new Error("No rule found for .my-class");
  }

  expect(myClassDeclarations).toStrictEqual(expected);
});
