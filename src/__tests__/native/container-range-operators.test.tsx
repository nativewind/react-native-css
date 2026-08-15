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
 * Every range operator means what it says. Sharing one operator's body across
 * all of them is invisible on most inputs - `500 > 100` and `500 >= 100` agree
 * - and shows up only at the boundary and in the reversed direction.
 */
describe("width", () => {
  test("> applies above the bound", () => {
    expect(renderContainer("(width > 400px)", 500, 200)).toHaveStyle(APPLIES);
  });

  test("> does not apply at the bound", () => {
    expect(renderContainer("(width > 500px)", 500, 200)).toHaveStyle(REFUSED);
  });

  test(">= applies at the bound", () => {
    expect(renderContainer("(width >= 500px)", 500, 200)).toHaveStyle(APPLIES);
  });

  test(">= does not apply below the bound", () => {
    expect(renderContainer("(width >= 600px)", 500, 200)).toHaveStyle(REFUSED);
  });

  test("< applies below the bound", () => {
    expect(renderContainer("(width < 600px)", 500, 200)).toHaveStyle(APPLIES);
  });

  test("< does not apply above the bound", () => {
    expect(renderContainer("(width < 400px)", 500, 200)).toHaveStyle(REFUSED);
  });

  test("< does not apply at the bound", () => {
    expect(renderContainer("(width < 500px)", 500, 200)).toHaveStyle(REFUSED);
  });

  test("<= applies at the bound", () => {
    expect(renderContainer("(width <= 500px)", 500, 200)).toHaveStyle(APPLIES);
  });

  test("<= does not apply above the bound", () => {
    expect(renderContainer("(width <= 400px)", 500, 200)).toHaveStyle(REFUSED);
  });
});

describe("the min-/max- prefixes reach the same operators", () => {
  test("min-width applies at the exact boundary", () => {
    expect(renderContainer("(min-width: 500px)", 500, 200)).toHaveStyle(
      APPLIES,
    );
  });

  test("max-width applies at the exact boundary", () => {
    expect(renderContainer("(max-width: 500px)", 500, 200)).toHaveStyle(
      APPLIES,
    );
  });

  test("max-width does not apply below the width", () => {
    expect(renderContainer("(max-width: 400px)", 500, 200)).toHaveStyle(
      REFUSED,
    );
  });
});

describe("height reaches the same operators", () => {
  test("< applies below the bound", () => {
    expect(renderContainer("(height < 300px)", 500, 200)).toHaveStyle(APPLIES);
  });

  test("< does not apply above the bound", () => {
    expect(renderContainer("(height < 100px)", 500, 200)).toHaveStyle(REFUSED);
  });

  test("<= applies at the bound", () => {
    expect(renderContainer("(height <= 200px)", 500, 200)).toHaveStyle(APPLIES);
  });
});
