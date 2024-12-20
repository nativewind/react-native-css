/** @jsxImportSource react-native-css */
import { View } from "react-native";

import {
  registerCSS,
  render,
  setupAllComponents,
  testID,
} from "react-native-css/jest";

setupAllComponents();

test("type prefix", () => {
  registerCSS(`html .my-class { color: red; }`, {
    selectorPrefix: "html",
  });

  const component = render(
    <View testID={testID} className="my-class" />,
  ).getByTestId(testID);

  expect(component).toHaveStyle({
    color: "#ff0000",
  });
});

test("class prefix", () => {
  registerCSS(`.test .my-class { color: red; }`, {
    selectorPrefix: ".test",
  });

  const component = render(
    <View testID={testID} className="my-class" />,
  ).getByTestId(testID);

  expect(component).toHaveStyle({
    color: "#ff0000",
  });
});
