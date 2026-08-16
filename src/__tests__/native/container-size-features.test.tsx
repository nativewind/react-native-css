import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

const parentID = "parent";
const childID = "child";

function renderContainer(query: string, width: number, height: number) {
  registerCSS(`
    .container { container-name: my-container; }
    .child { color: red; }
    @container ${query} { .child { color: blue; } }
  `);

  render(
    <View testID={parentID} className="container">
      <View testID={childID} className="child" />
    </View>,
  );

  fireEvent(screen.getByTestId(parentID), "layout", {
    nativeEvent: { layout: { width, height } },
  });

  return screen.getByTestId(childID);
}

const APPLIES = { color: "#00f" };
const REFUSED = { color: "#f00" };

/**
 * A container reports its own height. Answering the width for both makes every
 * container square, so `width > height` is never true and every container is
 * `portrait` however it is laid out.
 */
describe("a container's height is its own height", () => {
  test("a 500x200 container is landscape", () => {
    expect(renderContainer("(orientation: landscape)", 500, 200)).toHaveStyle(
      APPLIES,
    );
  });

  test("a 500x200 container is not portrait", () => {
    expect(renderContainer("(orientation: portrait)", 500, 200)).toHaveStyle(
      REFUSED,
    );
  });

  test("a 200x500 container is portrait", () => {
    expect(renderContainer("(orientation: portrait)", 200, 500)).toHaveStyle(
      APPLIES,
    );
  });

  test("a 200x500 container is not landscape", () => {
    expect(renderContainer("(orientation: landscape)", 200, 500)).toHaveStyle(
      REFUSED,
    );
  });

  test("a 500x200 container is not taller than 300px", () => {
    expect(renderContainer("(height > 300px)", 500, 200)).toHaveStyle(REFUSED);
  });

  test("a 500x200 container is taller than 100px", () => {
    expect(renderContainer("(height > 100px)", 500, 200)).toHaveStyle(APPLIES);
  });
});
