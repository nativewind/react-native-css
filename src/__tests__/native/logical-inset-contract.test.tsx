import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

// Expected native properties are specified independently of the compiler map.
test.each([
  ["inset-inline", "12px", { insetInline: 12 }],
  ["inset-inline", "12px 24px", { insetInlineStart: 12, insetInlineEnd: 24 }],
  ["inset-inline", "-8px 25%", { insetInlineStart: -8, insetInlineEnd: "25%" }],
  ["inset-block", "12px 24px", { insetBlockStart: 12, insetBlockEnd: 24 }],
])("%s: %s preserves its logical axis", (property, value, expected) => {
  registerCSS(`.position { ${property}: ${value}; }`);
  render(<View testID="position" className="position" />);
  expect(screen.getByTestId("position").props.style).toEqual(expected);
  screen.rerender(<View testID="position" />);
  expect(screen.getByTestId("position").props.style).toBeUndefined();
  screen.rerender(<View testID="position" className="position" />);
  expect(screen.getByTestId("position").props.style).toEqual(expected);
});
