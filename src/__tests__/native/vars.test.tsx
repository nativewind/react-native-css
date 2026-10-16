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

test("vars: an array is a list the declaration consumes", () => {
  registerCSS(`.my-class { font-variant-caps: var(--font-variant); }`);

  render(
    <View
      testID={testID}
      className="my-class"
      style={vars({ "--font-variant": ["small-caps"] })}
    />,
  );

  // fontVariant takes an array, so the list must survive the variable pipeline as a list
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    fontVariant: ["small-caps"],
  });
});

test("vars: undefined leaves the property unset", () => {
  // Kept, so the runtime resolves the variable the inline entry leaves unset
  registerCSS(
    `
    .my-class { color: var(--color); }
    .green { --color: #123456; }
  `,
    { inlineVariables: false },
  );

  render(
    <View
      testID={testID}
      className="my-class green"
      style={vars({ color: undefined })}
    />,
  );

  // An unset inline value lets the class's --color through
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#123456",
  });
});

test("vars does not create a key for an undefined value", () => {
  const inline = nativeVars({ "--defined": "red", "--absent": undefined });

  expect(Object.keys(inline)).toStrictEqual(["defined"]);
  expect("absent" in inline).toBe(false);
});
