import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { compile } from "react-native-css/compiler";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

import { dimensions } from "../../native/reactivity";

// Each condition against a 400x200 box, whose aspect ratio is 2
const cases = [
  ["(aspect-ratio: 2/1)", true],
  ["(aspect-ratio: 3/1)", false],
  ["(min-aspect-ratio: 2/1)", true],
  ["(min-aspect-ratio: 201/100)", false],
  ["(max-aspect-ratio: 2/1)", true],
  ["(max-aspect-ratio: 199/100)", false],
  ["(aspect-ratio > 1)", true],
  ["(max-aspect-ratio: 1/0)", true],
  ["(min-aspect-ratio: 1/0)", false],
  ["(min-aspect-ratio: 0/0)", false],
] as const;

test.each(cases)("@media %s matches: %s", (condition, matches) => {
  registerCSS(`
    .child { width: 10px; }
    @media ${condition} { .child { width: 37px; } }
  `);
  act(() => {
    dimensions.set({ ...dimensions.get(), width: 400, height: 200 });
  });
  render(<View testID="child" className="child" />);

  expect(screen.getByTestId("child")).toHaveStyle({ width: matches ? 37 : 10 });
});

test.each(cases)("@container %s matches: %s", (condition, matches) => {
  registerCSS(`
    .parent { container-type: size; }
    .child { width: 10px; }
    @container ${condition} { .child { width: 37px; } }
  `);
  render(
    <View testID="parent" className="parent">
      <View testID="child" className="child" />
    </View>,
  );
  fireEvent(screen.getByTestId("parent"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 200 } },
  });

  expect(screen.getByTestId("child")).toHaveStyle({ width: matches ? 37 : 10 });
});

test("a ratio over 0 survives the JSON a device receives the stylesheet as", () => {
  const stylesheet = compile(
    "@media (min-aspect-ratio: 1/0) { .child { color: red; } }",
  ).stylesheet();

  expect(stylesheet.s).toHaveLength(1);
  expect(JSON.parse(JSON.stringify(stylesheet))).toStrictEqual(stylesheet);
});
