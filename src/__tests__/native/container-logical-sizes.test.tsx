import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

test.each([
  ["inline-size", "width"],
  ["block-size", "height"],
] as const)("container %s is measured on its %s", (feature, dimension) => {
  registerCSS(`
    .parent { container-type: size; }
    .child { width: 10px; }
    @container (min-${feature}: 40px) { .child { width: 37px; } }
  `);
  render(
    <View testID="parent" className="parent">
      <View testID="child" className="child" />
    </View>,
  );

  for (const [size, expected] of [
    [39, 10],
    [40, 37],
    [41, 37],
  ] as const) {
    fireEvent(screen.getByTestId("parent"), "layout", {
      nativeEvent: {
        layout: { x: 0, y: 0, width: 200, height: 300, [dimension]: size },
      },
    });
    expect(screen.getByTestId("child")).toHaveStyle({ width: expected });
  }
});
