import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

// The seed is only defensible if an app can override it, so these pin that it can.
// They live in their own file because `inject` replaces a root variable outright and
// nothing puts it back — `react-native-css/jest`'s beforeEach clears
// StyleCollection.styles, not the root registry — so a `:root { color }` here would
// otherwise leak into every later test in the same file.
jest.mock("react-native", () => {
  const ReactNative =
    jest.requireActual<typeof import("react-native")>("react-native");
  ReactNative.Platform.OS = "android";
  return ReactNative;
});

test("a stylesheet :root color replaces the seed outright", () => {
  // An app that themes its text colour has to win, and a :root rule is how it does
  // that — not via an ancestor element, which is all the sibling suite covers
  colorScheme.set("light");
  registerCSS(`
    :root { color: #123456; }
    .c { color: currentcolor; }
  `);
  render(<View testID={testID} className="c" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#123456",
  });
});

test("a scheme-conditioned :root color overrides the seed per scheme", () => {
  colorScheme.set("dark");
  registerCSS(`
    :root { color: #123456; }
    @media (prefers-color-scheme: dark) {
      :root { color: #eeeeee; }
    }
    .c { color: currentcolor; }
  `);
  render(<View testID={testID} className="c" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#eee",
  });
});
