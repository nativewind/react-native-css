import { compile } from "react-native-css/compiler";
import { compileWithAutoDebug } from "react-native-css/jest";

// prettier-ignore
const tests = [
  ["-rn-ripple-color: black;", [{ d: [["black", ["android_ripple", "color"]]], s: [1, 1] }]],
  ["-rn-ripple-style: borderless;", [{ d: [[true, ["android_ripple", "borderless"]]], s: [1, 1] }]],
  ["-rn-ripple-radius: 10;", [{ d: [[10, ["android_ripple", "radius"]]], s: [1, 1] }]],
  ["-rn-ripple-layer: foreground;", [{ d: [[true, ["android_ripple", "foreground"]]], s: [1, 1] }]],
  ["caret-color: black", [{ d: [["#000", ["cursorColor"]]], s: [1, 1] }]],
  ["fill: black;", [{ d: [["#000", ["fill"]]], s: [1, 1] }]],
  ["rotate: 3deg;", [{ d: [[[{}, "rotateZ", "3deg"], "rotateZ"]], s: [1, 1] }]],
  ["rotate: x 3deg;", [{ d: [[[{}, "rotateX", "3deg"], "rotateX"]], s: [1, 1] }]],
  ["stroke-width: 1px;", [{ d: [[1, ["strokeWidth"]]], s: [1, 1] }]],
  ["stroke: black;", [{ d: [["#000", ["stroke"]]], s: [1, 1] }]],
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

test.each([
  [
    "left weight only",
    "color-mix(in oklab, var(--left) 90%, transparent)",
    ["oklab", [{}, "var", "left", 1], "90%", "transparent"],
  ],
  [
    "right weight only",
    "color-mix(in srgb, var(--left), var(--right) 25%)",
    ["srgb", [{}, "var", "left", 1], [{}, "var", "right", 1], "25%"],
  ],
  [
    "neither weight",
    "color-mix(in srgb, var(--left), var(--right))",
    ["srgb", [{}, "var", "left", 1], [{}, "var", "right", 1]],
  ],
] as const)(
  "color-mix serializes without absent weights: %s",
  (_, value, expected) => {
    const stylesheet = JSON.parse(
      JSON.stringify(
        compile(`.test { background-color: ${value}; }`, {
          inlineVariables: false,
        }).stylesheet(),
      ),
    ) as ReturnType<ReturnType<typeof compile>["stylesheet"]>;
    const declaration = stylesheet.s?.[0]?.[1]?.[0]?.d?.find(
      (entry) =>
        Array.isArray(entry) &&
        Array.isArray(entry[0]) &&
        entry[0][1] === "colorMix",
    );

    expect(
      Array.isArray(declaration) && Array.isArray(declaration[0])
        ? declaration[0][2]
        : undefined,
    ).toStrictEqual(expected);
  },
);
