import { View } from "react-native";

import { render, screen } from "@testing-library/react-native";

import { VariableContextProvider } from "../../web/api";

const testID = "react-native-css";

/** The custom properties the provider wrote onto its host element's style. */
const customProperties = (
  value: Parameters<typeof VariableContextProvider>[0]["value"],
): unknown => {
  render(
    <VariableContextProvider value={value}>
      <View testID={testID} />
    </VariableContextProvider>,
  );

  return screen.root.props.style;
};

test("an array is a comma-separated CSS list", () => {
  expect(customProperties({ "--font-stack": ["Inter", "Helvetica"] })).toEqual({
    "display": "contents",
    "--font-stack": "Inter,Helvetica",
  });
});

test("a nested array flattens into the same list", () => {
  expect(customProperties({ "--list": [1, ["a", true]] })).toEqual({
    "display": "contents",
    "--list": "1,a,true",
  });
});

test("undefined leaves the property unset", () => {
  expect(customProperties({ "--set": "red", "--unset": undefined })).toEqual({
    "display": "contents",
    "--set": "red",
  });
});

test("an undefined member drops out of the list", () => {
  expect(customProperties({ "--list": ["a", undefined, "b"] })).toEqual({
    "display": "contents",
    "--list": "a,b",
  });
});

test("scalars serialise to their token form", () => {
  expect(customProperties({ "--number": 1, "--boolean": true })).toEqual({
    "display": "contents",
    "--number": "1",
    "--boolean": "true",
  });
});
