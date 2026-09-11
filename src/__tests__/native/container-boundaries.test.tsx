import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components";
import { registerCSS } from "react-native-css/jest";

describe.each(["width", "height"])("container %s", (dimension) => {
  test.each([
    [">", [false, false, true]],
    [">=", [false, true, true]],
    ["<", [true, false, false]],
    ["<=", [true, true, false]],
    ["=", [false, true, false]],
  ] as const)("%s includes the correct boundary", (operator, expected) => {
    registerCSS(`.parent { container-name: test; container-type: size; }
      .child { opacity: 0.5; }
      @container test (${dimension} ${operator} 40px) { .child { opacity: 1; } }`);
    render(
      <View testID="parent" className="parent">
        <View testID="child" className="child" />
      </View>,
    );
    for (const [index, size] of [39, 40, 41].entries()) {
      fireEvent(screen.getByTestId("parent"), "layout", {
        nativeEvent: {
          layout: { x: 0, y: 0, width: 200, height: 300, [dimension]: size },
        },
      });
      expect(screen.getByTestId("child").props.style.opacity).toBe(
        expected[index] ? 1 : 0.5,
      );
    }
  });
});
