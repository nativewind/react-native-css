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

test("vars() outranks the element's own class declaration", () => {
  // Both are the element's OWN value, so the cascade decides between them by
  // origin rather than by inheritance: `vars()` reaches the style prop, which
  // is the inline half. The stylesheet-rule half is covered in
  // `variables.test.tsx`; this is the one case where the two meet.
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
  // The element's record is per-element, so consulting it first must not make
  // one sibling's declaration reach the other, nor stop the sibling that
  // declares nothing from inheriting.
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
  // `vars()` publishes downwards as well as declaring for the element itself,
  // so it is both channels at once. Reordering the lookup must leave the
  // inherited half intact.
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
