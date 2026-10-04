import { StyleSheet } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { SafeAreaView } from "react-native-css/components/react-native-safe-area-context";
import { registerCSS } from "react-native-css/jest";
import { SafeAreaView as OriginalSafeAreaView } from "react-native-safe-area-context";

// https://github.com/nativewind/react-native-css/issues/386
describe("SafeAreaView from the safe-area-context shim", () => {
  test("applies className as style", () => {
    registerCSS(`.screen { flex: 1; background-color: red; }`);

    render(<SafeAreaView testID="subject" className="screen" />);

    const subject = screen.getByTestId("subject");
    expect(StyleSheet.flatten(subject.props.style)).toStrictEqual({
      flexBasis: "0%",
      flexGrow: 1,
      flexShrink: 1,
      backgroundColor: "#f00",
    });
  });

  test("keeps its own props and an inline style next to className", () => {
    registerCSS(`.screen { flex: 1; }`);

    render(
      <>
        <SafeAreaView
          testID="shim"
          className="screen"
          edges={["top", "bottom"]}
          style={{ opacity: 0.5 }}
        />
        <OriginalSafeAreaView
          testID="original"
          edges={["top", "bottom"]}
          style={{ opacity: 0.5 }}
        />
      </>,
    );

    const shim = screen.getByTestId("shim");
    const original = screen.getByTestId("original");

    expect(StyleSheet.flatten(shim.props.style)).toStrictEqual({
      flexBasis: "0%",
      flexGrow: 1,
      flexShrink: 1,
      opacity: 0.5,
    });
    // Its own props reach the native component exactly as they do without the shim
    expect(shim.props.edges).toBeDefined();
    expect(shim.props.edges).toStrictEqual(original.props.edges);
  });

  test("renders without a className", () => {
    render(<SafeAreaView testID="subject" />);

    expect(screen.getByTestId("subject")).toBeTruthy();
  });
});
