import { memo, useEffect } from "react";
import type { ViewProps } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { styled, VariableContextProvider } from "react-native-css";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

test("inline variable", () => {
  registerCSS(`.my-class { width: var(--my-var); --my-var: 10px; }`);

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    style: { width: 10 },
    testID,
  });
});

test("combined inline variables", () => {
  registerCSS(`
    .my-class-1 { width: var(--my-var); }
    .my-class-2 { --my-var: 10px; }
    .my-class-3 { --my-var: 20px; }
  `);

  // Test with my-class-2
  render(<View testID={testID} className="my-class-1 my-class-2" />);
  let component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    style: { width: 10 },
    testID,
  });

  // Test with my-class-3
  render(<View testID={testID} className="my-class-1 my-class-3" />);
  component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    style: { width: 20 },
    testID,
  });
});

test("inherit variables", () => {
  registerCSS(`
    .my-class-1 { width: var(--my-var); }
    .my-class-2 { --my-var: 10px; }
    .my-class-3 { --my-var: 20px; }
  `);

  const effect = jest.fn();
  const Child = (props: ViewProps & { className?: string }) => {
    useEffect(effect);
    return <View {...props} />;
  };

  styled(Child, {
    className: "style",
  });

  const { getByTestId } = render(
    <View testID="a" className="my-class-2">
      <Child testID="b" className="my-class-1" />
    </View>,
  );

  const a = getByTestId("a");
  let b = getByTestId("b");

  expect(a.props.style).toStrictEqual(undefined);
  expect(b.props.style).toStrictEqual({ width: 10 });
  expect(effect).toHaveBeenCalledTimes(1);

  screen.rerender(
    <View testID="a" className="my-class-3">
      <View testID="b" className="my-class-1" />
    </View>,
  );

  b = getByTestId("b");

  // expect(B.mock).toHaveBeenCalledTimes(2);
  expect(a.props.style).toStrictEqual(undefined);
  expect(b.props.style).toStrictEqual({ width: 20 });
});

test("inherit variables - memo", () => {
  const effect = jest.fn();
  const Child = memo((props: ViewProps & { className?: string }) => {
    useEffect(effect);
    return <View {...props} />;
  });

  registerCSS(`
    .my-class-1 { width: var(--my-var); }
    .my-class-2 { --my-var: 10px; }
    .my-class-3 { --my-var: 20px; }
  `);

  const { getByTestId } = render(
    <View testID="a" className="my-class-2">
      <Child testID="b" className="my-class-1" />
    </View>,
  );

  const a = getByTestId("a");
  let b = getByTestId("b");

  expect(a.props.style).toStrictEqual(undefined);
  expect(b.props.style).toStrictEqual({ width: 10 });

  screen.rerender(
    <View testID="a" className="my-class-3">
      <Child testID="b" className="my-class-1" />
    </View>,
  );

  b = getByTestId("b");

  expect(a.props.style).toStrictEqual(undefined);
  expect(b.props.style).toStrictEqual({ width: 20 });

  expect(effect).toHaveBeenCalledTimes(1);
});

test(":root variables", () => {
  registerCSS(`
    :root { --my-var: red; }
    .my-class { color: var(--my-var); }
  `);

  const component = render(
    <View testID={testID} className="my-class" />,
  ).getByTestId(testID);

  expect(component.props.style).toStrictEqual({ color: "#f00" });
});

test("can apply and set new variables", () => {
  registerCSS(`
    :root { --my-var: red; }
    .my-class { color: var(--my-var); --another-var: green; }
    .another-class { color: var(--another-var); }
  `);

  const testIDs = {
    one: "one",
    two: "two",
    three: "three",
  };

  render(
    <View testID={testIDs.one} className="my-class">
      <View testID={testIDs.two} className="my-class" />
      <View testID={testIDs.three} className="another-class" />
    </View>,
  );

  expect(screen.getByTestId(testIDs.one).props.style).toStrictEqual({
    color: "#f00",
  });
  expect(screen.getByTestId(testIDs.two).props.style).toStrictEqual({
    color: "#f00",
  });
  expect(screen.getByTestId(testIDs.three).props.style).toStrictEqual({
    color: "#008000",
  });
});

test("variables will be inherited", () => {
  registerCSS(`
    :root { --my-var: red; }
    .green { --var-2: green; }
    .blue { --var-3: blue; }
    .color { color: var(--var-2); }
  `);

  const testIDs = {
    one: "one",
    two: "two",
    three: "three",
  };

  render(
    <View testID={testIDs.one} className="green">
      <View testID={testIDs.two} className="blue">
        <View testID={testIDs.three} className="color" />
      </View>
    </View>,
  );

  expect(screen.getByTestId(testIDs.three).props.style).toStrictEqual({
    color: "#008000",
  });
});

test("useUnsafeVariable", () => {
  registerCSS(`
    :root { --my-var: red; }
    .test { color: var(--my-var); }
  `);

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({ color: "#f00" });
});

test("ratio values", () => {
  registerCSS(`
    :root { --my-var: 16 / 9; }
    .test { aspect-ratio: var(--my-var); }
  `);

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({ aspectRatio: "16/9" });
});

test("VariableContextProvider", () => {
  registerCSS(`
    .test { color: var(--my-var); }
  `);

  render(
    <VariableContextProvider value={{ "--my-var": "red" }}>
      <View testID={testID} className="test" />
    </VariableContextProvider>,
  );

  const component = screen.getByTestId(testID);
  expect(component.props.style).toStrictEqual({ color: "red" });
});

test("variable overriding with classes", () => {
  registerCSS(`
  :root {
   --tier-red-500: red;
   --tier-red-700: red;

   --tier-blue-500: blue;
   --tier-blue-700: blue;
  }

  .tier-red {
    --tier-500: var(--tier-red-500);
    --tier-700: var(--tier-red-700);
  }

  .test {
    color: var(--tier-500)
  }
`);

  render(
    <View className="tier-red">
      <View testID={testID} className="test" />
    </View>,
  );

  const component = screen.getByTestId(testID);
  expect(component.props.style).toStrictEqual({ color: "#f00" });
});

/**
 * css-cascade-4 §7.2 makes inheritance a DEFAULTING step: an element inherits a
 * property only when the cascade produces no declared value for it. A custom
 * property is an ordinary property (css-variables-1 §2), so an element that
 * declares `--x` in one of its own matched rules uses that value, whatever any
 * ancestor declares.
 *
 * These cases use no `vars()`. A rule's `v` entries and a `vars()` object land
 * in the same runtime bucket (`calculate-props.ts`), so the ordering is one
 * behaviour — but plain stylesheet CSS is the half every consumer writes, and
 * it is the half that had no coverage.
 *
 * `--my-var` is declared more than once in every sheet below on purpose:
 * `inline-variables.ts` folds a singly-declared custom property into the
 * declaration that reads it, and a folded property performs no runtime lookup
 * at all — so the one-definition form of each of these passes without reaching
 * the code under test. `src/__tests__/compiler/inline-variables.test.ts` pins
 * that fold, so this requirement is checkable rather than remembered.
 */
const DEFEAT_INLINING = `.elsewhere { --my-var: seed; }`;

test("an element's own rule outranks an ancestor's rule", () => {
  registerCSS(`
    ${DEFEAT_INLINING}
    .ancestor { --my-var: red; }
    .own { --my-var: blue; color: var(--my-var); }
  `);

  render(
    <View className="ancestor">
      <View testID={testID} className="own" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "blue",
  });
});

test("an element's own rule outranks a VariableContextProvider", () => {
  registerCSS(`
    ${DEFEAT_INLINING}
    .own { --my-var: blue; color: var(--my-var); }
  `);

  render(
    <VariableContextProvider value={{ "--my-var": "red" }}>
      <View testID={testID} className="own" />
    </VariableContextProvider>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "blue",
  });
});

test("an element's own rule outranks :root", () => {
  registerCSS(`
    :root { --my-var: red; }
    ${DEFEAT_INLINING}
    .own { --my-var: blue; color: var(--my-var); }
  `);

  render(<View testID={testID} className="own" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "blue",
  });
});

test("a changed inherited value does not displace the element's own declaration", () => {
  registerCSS(`
    ${DEFEAT_INLINING}
    .own { --my-var: blue; color: var(--my-var); }
  `);

  const tree = (inherited: string) => (
    <VariableContextProvider value={{ "--my-var": inherited }}>
      <View testID={testID} className="own" />
    </VariableContextProvider>
  );

  render(tree("red"));
  const component = screen.getByTestId(testID);
  expect(component.props.style).toStrictEqual({ color: "blue" });

  // The re-render is the part worth having: the inherited value is what the
  // render guard is keyed on, so a context change re-resolves the element even
  // though its answer must not move.
  screen.rerender(tree("green"));
  expect(component.props.style).toStrictEqual({ color: "blue" });
});

test("a declaring element's value still reaches its descendants", () => {
  registerCSS(`
    ${DEFEAT_INLINING}
    .own { --my-var: blue; color: var(--my-var); }
    .reader { color: var(--my-var); }
  `);

  render(
    <View testID="parent" className="own">
      <View testID="child" className="reader" />
    </View>,
  );

  // Consulting the element's own record first must not stop it publishing that
  // record downwards — the declaration is both its own value and the one its
  // descendants inherit.
  expect(screen.getByTestId("parent").props.style).toStrictEqual({
    color: "blue",
  });
  expect(screen.getByTestId("child").props.style).toStrictEqual({
    color: "blue",
  });
});
