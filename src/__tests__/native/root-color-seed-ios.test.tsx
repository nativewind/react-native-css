import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

// jest-expo runs with Platform.OS === "ios" by default (no mock needed), so
// native-internal/root takes the iOS branch when the runtime loads here.
describe("ios root __rn-css-color seed", () => {
  test("keeps PlatformColor('label') — the first-class dynamic system color", () => {
    // iOS is unchanged: PlatformColor('label') already tracks the system
    // appearance, so only Android needed the concrete scheme-aware seed.
    registerCSS(`.c { color: currentcolor; }`);
    render(<View testID={testID} className="c" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      color: { semantic: ["label", "labelColor"] },
    });
  });

  test("an ancestor-published color still overrides the PlatformColor seed", () => {
    // The resolution machinery is platform-agnostic; a nearer published color
    // wins on iOS too, so the seed remains only the ultimate fallback.
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
});
