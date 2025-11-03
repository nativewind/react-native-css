import { render } from "@testing-library/react-native";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
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

test("important should overwrite the inline style", () => {
  registerCSS(`.text-red\\! { color: red !important; }`);

  const component = render(
    <Text testID={testID} className="text-red!" style={{ color: "blue" }} />,
  ).getByTestId(testID);

  expect(component.props.style).toEqual({ color: "#f00" });
});

test("View with multiple className properties where inline style takes precedence", () => {
  registerCSS(`
    .px-4 { padding-left: 16px; padding-right: 16px; }
    .pt-4 { padding-top: 16px; }
    .mb-4 { margin-bottom: 16px; }
  `);

  const component = render(
    <View
      testID={testID}
      className="px-4 pt-4 mb-4"
      style={{ width: 300, paddingRight: 0 }}
    />,
  ).getByTestId(testID);

  // Inline style should override paddingRight from px-4 class
  // Other className styles should be preserved in array
  expect(component.props.style).toEqual([
    {
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 16,
      marginBottom: 16,
    },
    {
      width: 300,
      paddingRight: 0,
    },
  ]);
});
