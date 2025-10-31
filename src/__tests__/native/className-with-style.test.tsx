import { render } from "@testing-library/react-native";
import { Text } from "react-native-css/components/Text";
import { registerCSS, testID } from "react-native-css/jest";

test("className with inline style props should coexist when different properties", () => {
  registerCSS(`.text-red { color: red; }`);

  const component = render(
    <Text testID={testID} className="text-red" style={{ fontSize: 16 }} />,
  ).getByTestId(testID);

  // Both className and style props should be applied as array
  expect(component.props.style).toEqual([
    { color: "#f00" }, // Changed from "red" to "#f00"
    { fontSize: 16 },
  ]);
});

test("className with inline style props should favor inline when same property", () => {
  registerCSS(`.text-red { color: red; }`);

  const component = render(
    <Text testID={testID} className="text-red" style={{ color: "blue" }} />,
  ).getByTestId(testID);

  // When same property exists, inline style should win (not array)
  expect(component.props.style).toEqual({ color: "blue" });
});

test("only className should not create array", () => {
  registerCSS(`.text-red { color: red; }`);

  const component = render(
    <Text testID={testID} className="text-red" />,
  ).getByTestId(testID);

  // Only className should be a flat object
  expect(component.props.style).toEqual({ color: "#f00" }); // Changed from "red" to "#f00"
});

test("only inline style should not create array", () => {
  const component = render(
    <Text testID={testID} style={{ color: "blue" }} />,
  ).getByTestId(testID);

  // Only inline style should be a flat object
  expect(component.props.style).toEqual({ color: "blue" });
});
