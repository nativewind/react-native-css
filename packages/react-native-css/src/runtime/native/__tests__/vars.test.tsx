/** @jsxImportSource react-native-css */
import { View } from "react-native";

import {
  registerCSS,
  render,
  screen,
  setupAllComponents,
  testID,
} from "react-native-css/jest";

import { vars } from "../api";

setupAllComponents();

test("vars", () => {
  registerCSS(
    `.my-class {
        color: var(--test);
      }`,
  );

  render(
    <View
      testID={testID}
      className="my-class"
      style={vars({ test: "black" })}
    />,
  );

  const component = screen.getByTestId(testID);

  expect(component).toHaveStyle({
    color: "black",
  });

  screen.rerender(
    <View
      testID={testID + 1}
      className="my-class"
      style={vars({ test: "blue" })}
    />,
  );

  expect(component).toHaveStyle({
    color: "blue",
  });
});
