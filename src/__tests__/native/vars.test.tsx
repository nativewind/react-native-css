/* eslint-disable @typescript-eslint/no-deprecated */
import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { VariableContextProvider, vars } from "react-native-css/runtime";

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

test("an element's own vars() outranks an inherited value", () => {
  // Declared twice so the inliner cannot fold it
  registerCSS(
    `.decoy { --my-var: seed; }
     .other-decoy { --my-var: seed2; }
     .my-class { color: var(--my-var); }`,
  );

  render(
    <VariableContextProvider value={{ "--my-var": "red" }}>
      <View
        testID={testID}
        className="my-class"
        style={vars({ "--my-var": "blue" })}
      />
    </VariableContextProvider>,
  );

  // Inheritance applies only where the cascade yields no declared value (css-cascade-4 §7.2)
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "blue",
  });
});

test("an inherited value still applies when the element declares nothing", () => {
  registerCSS(
    `.decoy { --my-var: seed; }
     .other-decoy { --my-var: seed2; }
     .my-class { color: var(--my-var); }`,
  );

  render(
    <VariableContextProvider value={{ "--my-var": "red" }}>
      <View testID={testID} className="my-class" />
    </VariableContextProvider>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "red",
  });
});

test("vars() outranks the element's own class declaration", () => {
  registerCSS(
    `.decoy { --my-var: seed; }
     .my-class { --my-var: blue; color: var(--my-var); }`,
  );

  render(
    <VariableContextProvider value={{ "--my-var": "red" }}>
      <View
        testID={testID}
        className="my-class"
        style={vars({ "--my-var": "green" })}
      />
    </VariableContextProvider>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "green",
  });
});

test("siblings under one provider each resolve against their own declaration", () => {
  registerCSS(
    `.decoy { --my-var: seed; }
     .other-decoy { --my-var: seed2; }
     .my-class { color: var(--my-var); }`,
  );

  render(
    <VariableContextProvider value={{ "--my-var": "red" }}>
      <View testID="inherits" className="my-class" />
      <View
        testID="declares"
        className="my-class"
        style={vars({ "--my-var": "blue" })}
      />
    </VariableContextProvider>,
  );

  expect(screen.getByTestId("inherits").props.style).toStrictEqual({
    color: "red",
  });
  expect(screen.getByTestId("declares").props.style).toStrictEqual({
    color: "blue",
  });
});

test("vars() on a parent still reaches a descendant", () => {
  registerCSS(
    `.decoy { --my-var: seed; }
     .other-decoy { --my-var: seed2; }
     .my-class { color: var(--my-var); }`,
  );

  render(
    <View className="my-class" style={vars({ "--my-var": "blue" })}>
      <View testID={testID} className="my-class" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "blue",
  });
});
