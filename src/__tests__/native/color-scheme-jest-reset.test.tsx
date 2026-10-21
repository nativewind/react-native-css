import { Appearance } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

jest.mock("react-native/Libraries/Utilities/NativeAppearance", () => ({
  __esModule: true,
  default: {
    addListener: () => undefined,
    removeListeners: () => undefined,
    getColorScheme: () => "dark",
    setColorScheme: () => undefined,
  },
}));

test("each test starts from the scheme Appearance reports", () => {
  registerCSS(`
.my-class { color: green; }

@media (prefers-color-scheme: dark) {
  .my-class { color: red; }
}`);
  render(<View testID={testID} className="my-class" />);

  expect(Appearance.getColorScheme()).toBe("dark");
  expect(colorScheme.get()).toBe("dark");
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#f00",
  });
});
