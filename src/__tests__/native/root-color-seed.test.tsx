import { act, render, screen } from "@testing-library/react-native";
import { compile } from "react-native-css/compiler";
import { TextInput } from "react-native-css/components/TextInput";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

const consumers: [declaration: string, prop: (string | number)[]][] = [
  ["color: currentcolor", ["style", "color"]],
  ["background-color: currentcolor", ["style", "backgroundColor"]],
  ["border-color: currentcolor", ["style", "borderColor"]],
  ["border-top-color: currentcolor", ["style", "borderTopColor"]],
  ["border-inline-start-color: currentcolor", ["style", "borderStartColor"]],
  ["outline-color: currentcolor", ["style", "outlineColor"]],
  ["text-decoration: underline currentcolor", ["style", "textDecorationColor"]],
  ["caret-color: currentcolor", ["cursorColor"]],
  ["box-shadow: 0 0 0 2px currentcolor", ["style", "boxShadow", 0, "color"]],
  [
    "box-shadow: inset 0 0 0 2px currentcolor",
    ["style", "boxShadow", 0, "color"],
  ],
  ["text-shadow: 1px 1px 2px currentcolor", ["style", "textShadowColor"]],
  ["fill: currentcolor", ["fill"]],
  ["stroke: currentcolor", ["stroke"]],
];

test.each(consumers)(
  "%s compiles to a reference to the root color",
  (declaration) => {
    const rule = compile(`.c { ${declaration}; }`).stylesheet().s?.[0]?.[1][0];

    expect(rule?.d).toContainEqual(
      expect.arrayContaining([[{}, "var", "__rn-css-color"]]),
    );
  },
);

// CSS Color 4: with no `color` set, `currentcolor` takes `color`'s initial
// value, `CanvasText` — black in a light scheme and white in a dark one.
describe.each([
  ["light", "#000000"],
  ["dark", "#FFFFFF"],
] as const)("in a %s scheme", (scheme, seed) => {
  test.each(consumers)(
    `%s with no color above it paints ${seed}`,
    (declaration, prop) => {
      colorScheme.set(scheme);
      registerCSS(`.c { ${declaration}; }`);
      render(<TextInput testID={testID} className="c" />);

      expect(screen.getByTestId(testID).props).toHaveProperty(prop, seed);
    },
  );

  test(`currentcolor in a variable the compiler keeps paints ${seed}`, () => {
    colorScheme.set(scheme);
    registerCSS(`.c { --c: currentcolor; border-color: var(--c); }`, {
      inlineVariables: false,
    });
    render(<View testID={testID} className="c" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      borderColor: seed,
    });
  });
});

test("no scheme preference takes the light seed", () => {
  colorScheme.set(null);
  registerCSS(`.c { color: currentcolor; }`);
  render(<View testID={testID} className="c" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#000000",
  });
});

test("the seed follows a scheme change on a mounted element", () => {
  colorScheme.set("light");
  registerCSS(`.c { color: currentcolor; }`);
  render(<View testID={testID} className="c" />);
  const element = screen.getByTestId(testID);

  expect(element.props.style).toStrictEqual({ color: "#000000" });

  act(() => {
    colorScheme.set("dark");
  });

  expect(element.props.style).toStrictEqual({ color: "#FFFFFF" });
});

test("an ancestor's color overrides the seed", () => {
  colorScheme.set("light");
  registerCSS(`
    .parent { color: red; }
    .child { color: currentcolor; }
  `);
  render(
    <View testID="parent" className="parent">
      <View testID={testID} className="child" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#f00",
  });
});

test("a :root color overrides the seed", () => {
  colorScheme.set("light");
  registerCSS(`
    :root { color: #123456; }
    .c { color: currentcolor; }
  `);
  render(<View testID={testID} className="c" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#123456",
  });
});

test("a scheme-conditioned :root color overrides the seed in that scheme", () => {
  colorScheme.set("dark");
  registerCSS(`
    :root { color: #123456; }
    @media (prefers-color-scheme: dark) {
      :root { color: #eeeeee; }
    }
    .c { color: currentcolor; }
  `);
  render(<View testID={testID} className="c" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#eee",
  });
});
