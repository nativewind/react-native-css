import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

import { dimensions } from "../../native/reactivity";

function mediaMatches(condition: string): boolean {
  registerCSS(`
    .child { width: 10px; }
    @media ${condition} { .child { width: 37px; } }
  `);
  act(() => {
    dimensions.set({ ...dimensions.get(), width: 600, height: 400 });
  });
  const { unmount } = render(<View testID="child" className="child" />);
  const { width } = screen.getByTestId("child").props.style;
  unmount();
  return width === 37;
}

function containerMatches(
  condition: string,
  size = { width: 400, height: 200 },
): boolean {
  registerCSS(`
    .parent { container-type: size; }
    .child { width: 10px; }
    @container ${condition} { .child { width: 37px; } }
  `);
  const { unmount } = render(
    <View testID="parent" className="parent">
      <View testID="child" className="child" />
    </View>,
  );
  fireEvent(screen.getByTestId("parent"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, ...size } },
  });
  const { width } = screen.getByTestId("child").props.style;
  unmount();
  return width === 37;
}

describe("@media on a 600x400 screen", () => {
  test.each([
    ["(400px < width < 800px)", true],
    ["(400px < width < 500px)", false],
    ["(600px < width < 800px)", false],
    ["(600px <= width < 800px)", true],
    ["(800px > width > 400px)", true],
    ["(300px < height < 500px)", true],
  ])("a range pair %s matches: %s", (condition, expected) => {
    expect(mediaMatches(condition)).toBe(expected);
  });
});

describe("@container on a 400x200 container", () => {
  test.each([
    ["(300px < width < 500px)", true],
    ["(400px < width < 500px)", false],
    ["(500px > width > 300px)", true],
    ["(100px < height < 300px)", true],
  ])("a range pair %s matches: %s", (condition, expected) => {
    expect(containerMatches(condition)).toBe(expected);
  });
});
