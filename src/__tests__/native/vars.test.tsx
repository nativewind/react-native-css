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
  // `--my-var` is defined twice so `inline-variables.ts` cannot fold it into
  // the consuming declaration; a single definition performs no runtime var()
  // read and would pass without exercising precedence at all.
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

  // css-cascade-4 §7.2: inheritance is a defaulting step, reached only when the
  // cascade yields no declared value for the element. The element declares
  // `--my-var`, so the ancestor's `red` never applies to it.
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
