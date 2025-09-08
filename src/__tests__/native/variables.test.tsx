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
