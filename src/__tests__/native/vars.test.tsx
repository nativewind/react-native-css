/* eslint-disable @typescript-eslint/no-deprecated */
import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { vars } from "react-native-css/runtime";

// `vars()` is platform-split and `react-native-css/runtime` is its web half to
// TypeScript. The case below is about what the native implementation stores, so
// it reaches that implementation directly, as units.test.tsx does.
import { vars as nativeVars } from "../../native/api";

test("vars", () => {
  registerCSS(
    `.my-class {
        color: var(--color);
      }`,
  );

  render(
    <View
      testID={testID}
      className="my-class"
      style={vars({ color: "red" })}
    />,
  );

  const element = screen.getByTestId(testID);
  expect(element.props.style).toMatchObject({
    color: "red",
  });

  screen.rerender(
    <View
      testID={testID}
      className="my-class"
      style={vars({ color: "blue" })}
    />,
  );

  expect(element.props.style).toMatchObject({
    color: "blue",
  });
});

test("vars does not create a key for an undefined value", () => {
  const inline = nativeVars({ "--defined": "red", "--absent": undefined });

  expect(Object.keys(inline)).toStrictEqual(["defined"]);
  expect("absent" in inline).toBe(false);
});
