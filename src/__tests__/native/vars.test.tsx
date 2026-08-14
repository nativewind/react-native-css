/* eslint-disable @typescript-eslint/no-deprecated */
import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { vars } from "react-native-css/runtime";

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

  // `fontVariant` is one of the React Native style properties that takes an
  // array, so the list has to survive the variable pipeline as a list.
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    fontVariant: ["small-caps"],
  });
});

test("vars: undefined leaves the property unset", () => {
  registerCSS(`
    .my-class { color: var(--color); }
    .green { --color: green; }
  `);

  render(
    <View
      testID={testID}
      className="my-class green"
      style={vars({ color: undefined })}
    />,
  );

  // The class still sets `--color`, so leaving the inline value unset lets it
  // through rather than blanking the property.
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#008000",
  });
});
