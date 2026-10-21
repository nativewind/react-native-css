import { Appearance } from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

const TRI_STATE_CSS = `
.my-class { color: green; }

@media (prefers-color-scheme: light) {
  .my-class { color: blue; }
}

@media (prefers-color-scheme: dark) {
  .my-class { color: red; }
}`;

const BLUE = { color: "#00f" } as const;
const RED = { color: "#f00" } as const;

beforeEach(() => {
  registerCSS(TRI_STATE_CSS);
  render(<View testID={testID} className="my-class" />);
});

test("without an Appearance module, colorScheme.set holds the scheme for both layers", () => {
  act(() => {
    colorScheme.set("dark");
  });

  expect(Appearance.getColorScheme()).toBeNull();
  expect(colorScheme.get()).toBe("dark");
  expect(screen.getByTestId(testID).props.style).toStrictEqual(RED);
});

test.each([null, "unspecified"] as const)(
  "without an Appearance module, set(%p) resolves light on both layers",
  (handBack) => {
    act(() => {
      colorScheme.set("dark");
    });
    act(() => {
      colorScheme.set(handBack);
    });

    expect(colorScheme.get()).toBe("light");
    expect(screen.getByTestId(testID).props.style).toStrictEqual(BLUE);
  },
);
