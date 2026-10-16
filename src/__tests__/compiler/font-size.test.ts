import { compileWithAutoDebug } from "react-native-css/jest";

const parentRelative = (size: unknown) => [{}, "fontSize", size, 1];

const rulesOf = (css: string) =>
  compileWithAutoDebug(`.my-class { ${css} }`)
    .stylesheet()
    .s?.find((rule) => rule[0] === "my-class")?.[1];

// prettier-ignore
test.each([
  ["font-size: 2em", parentRelative([{}, "em", 2, 1])],
  ["font-size: 150%", parentRelative([{}, "em", 1.5, 1])],
  ["font-size: 33.333%", parentRelative([{}, "em", 33.333 / 100, 1])],
  ["font: 150% Arial", parentRelative([{}, "em", 1.5, 1])],
  ["font-size: var(--size)", parentRelative([{}, "var", "size", 1])],
])("%s is computed against the parent's font size and published as the em", (css, fontSize) => {
  const [rule] = rulesOf(css) ?? [];

  expect(rule?.d).toContainEqual([fontSize, "fontSize", 1]);
  expect(rule?.v).toContainEqual(["__rn-css-em", fontSize]);
  expect(rule?.dv).toBe(1);
});

test("an absolute font size is static and published as the em", () => {
  expect(rulesOf("font-size: 10px")).toStrictEqual([
    {
      d: [{ fontSize: 10 }],
      s: [1, 1],
      v: [["__rn-css-em", 10]],
    },
  ]);
});

test("a rule reading em reads the inherited em channel", () => {
  expect(rulesOf("width: 2em")).toStrictEqual([
    {
      d: [[[{}, "em", 2, 1], "width", 1]],
      dv: 1,
      s: [1, 1],
    },
  ]);
});

test("a font size crosses the wire unchanged", () => {
  const stylesheet = compileWithAutoDebug(
    `.a { font-size: 2em; } .b { font-size: 150%; } .c { font: 150% Arial; } .d { font-size: var(--size); }`,
  ).stylesheet();
  const wire = JSON.stringify(stylesheet);

  expect(JSON.parse(wire)).toStrictEqual(stylesheet);
});
