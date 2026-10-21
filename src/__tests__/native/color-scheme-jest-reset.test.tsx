import { Appearance } from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

import { resetBetweenTests } from "../../jest/reset";
import { colorScheme as heldColorScheme } from "../../native/reactivity";

jest.mock("react-native/Libraries/Utilities/NativeAppearance", () => ({
  __esModule: true,
  default: {
    addListener: () => undefined,
    removeListeners: () => undefined,
    getColorScheme: () => "dark",
    setColorScheme: () => undefined,
  },
}));

test("the jest helper's reset puts back the scheme Appearance reports after a test changed it", () => {
  act(() => {
    heldColorScheme.set("light");
  });
  expect(colorScheme.get()).toBe("light");

  act(() => {
    resetBetweenTests();
  });
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
