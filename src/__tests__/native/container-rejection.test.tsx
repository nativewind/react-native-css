import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

// Style queries are unsupported. An unsupported condition must not become an
// unconditional rule or disappear from a conjunction with a supported size test.
test.each([
  "style(--theme: dark)",
  "not style(--theme: dark)",
  "(width > 100px) and style(--theme: dark)",
  "style(--theme: dark) and (width > 100px)",
  "style(--theme: dark) or style(--theme: light)",
])("unsupported container predicate does not apply: %s", (condition) => {
  registerCSS(`
    .container { container-type: inline-size; }
    .child { width: 10px; }
    @container ${condition} { .child { width: 37px; } }
  `);
  render(
    <View testID="parent" className="container">
      <View testID="child" className="child" />
    </View>,
  );
  for (const width of [200, 50, 200]) {
    fireEvent(screen.getByTestId("parent"), "layout", {
      nativeEvent: { layout: { width, height: 200 } },
    });
    expect(screen.getByTestId("child")).toHaveStyle({ width: 10 });
  }
});

test("negated conjunction applies only where its size condition decides it", () => {
  registerCSS(`
    .container { container-type: inline-size; }
    .child { width: 10px; }
    @container not ((width > 100px) and style(--theme: dark)) {
      .child { width: 37px; }
    }
  `);
  render(
    <View testID="parent" className="container">
      <View testID="child" className="child" />
    </View>,
  );
  // Below 100px the conjunction is false whatever style() answers, so its negation is true
  for (const [width, expected] of [
    [200, 10],
    [50, 37],
    [200, 10],
  ]) {
    fireEvent(screen.getByTestId("parent"), "layout", {
      nativeEvent: { layout: { width, height: 200 } },
    });
    expect(screen.getByTestId("child")).toHaveStyle({ width: expected });
  }
});

test("supported disjunction retains its size condition and responds to resizing", () => {
  registerCSS(`
    .container { container-type: inline-size; }
    .child { width: 10px; }
    @container (width > 100px) or style(--theme: dark) {
      .child { width: 37px; }
    }
  `);
  render(
    <View testID="parent" className="container">
      <View testID="child" className="child" />
    </View>,
  );
  for (const [width, expected] of [
    [200, 37],
    [50, 10],
    [200, 37],
  ]) {
    fireEvent(screen.getByTestId("parent"), "layout", {
      nativeEvent: { layout: { width, height: 200 } },
    });
    expect(screen.getByTestId("child")).toHaveStyle({ width: expected });
  }
});
