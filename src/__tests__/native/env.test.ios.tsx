import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-css/components/SafeAreaProvider";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

test("safe-area-inset-*", () => {
  registerCSS(`.my-class {
    margin-top: env(safe-area-inset-top);
    margin-bottom: env(safe-area-inset-bottom);
    margin-left: env(safe-area-inset-left);
    margin-right: env(safe-area-inset-right);
  }`);

  render(
    <SafeAreaProvider
      initialMetrics={{
        insets: { top: 1, bottom: 2, left: 3, right: 4 },
        frame: { x: 0, y: 0, width: 0, height: 0 },
      }}
    >
      <View testID={testID} className="my-class" />
    </SafeAreaProvider>,
  );
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    marginTop: 1,
    marginBottom: 2,
    marginLeft: 3,
    marginRight: 4,
  });
});
