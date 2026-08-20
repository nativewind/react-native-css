import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

// jest-expo runs with Platform.OS === "ios" by default (no mock needed), so this
// file is the seed as iOS actually loads it. There is no longer an iOS BRANCH to
// take — that is what it exists to prove.
describe("ios root __rn-css-color seed", () => {
  test("resolves to a concrete color, the same one every other platform gets", () => {
    // This file used to assert that PlatformColor's descriptor reached props.style.
    // That pins ARRIVAL, not paint, and cannot tell the two apart: pre-fix, the
    // Android sibling's props bag held the same shape on the build that painted no
    // ring and invisible text-current on a device. A concrete color is asserted
    // instead, because a value that is wrong is then visibly wrong here.
    //
    // The scheme is pinned because the seed is scheme-aware on iOS for the first
    // time — PlatformColor used to absorb that, and now the observable answers it.
    colorScheme.set("light");
    registerCSS(`.c { color: currentcolor; }`);
    render(<View testID={testID} className="c" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      color: "#000000",
    });
  });

  test("follows the scheme, so neither arm is a constant", () => {
    // A seed that had stopped resolving and simply held one branch would satisfy the
    // test above whenever it asked for that branch. Driving both refutes it.
    colorScheme.set("dark");
    registerCSS(`.c { color: currentcolor; }`);
    render(<View testID={testID} className="c" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      color: "#FFFFFF",
    });
  });

  test("an ancestor-published color still overrides the seed", () => {
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
