import { memo, useEffect } from "react";
import type { ViewProps } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { styled, VariableContextProvider } from "react-native-css/runtime";

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

test("combined inline variable", () => {
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

  expect(component.props.style).toStrictEqual({ color: "red" });
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
    color: "red",
  });
  expect(screen.getByTestId(testIDs.two).props.style).toStrictEqual({
    color: "red",
  });
  expect(screen.getByTestId(testIDs.three).props.style).toStrictEqual({
    color: "green",
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
    color: "green",
  });
});

test("useUnsafeVariable", () => {
  registerCSS(`
    :root { --my-var: red; }
    .test { color: var(--my-var); }
  `);

  // Since we can't directly test the hook in isolation with the render approach,
  // we'll test that a component using the variable gets the correct value
  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({ color: "red" });
});

test("ratio values", () => {
  registerCSS(`
    :root { --my-var: 16 / 9; }
    .test { aspect-ratio: var(--my-var); }
  `);

  // Since we can't directly test the hook in isolation with the render approach,
  // we'll test that a component using the variable gets the correct value
  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({ aspectRatio: "16 / 9" });
});

test("shadow values - single", () => {
  registerCSS(`
    :root { --color: #fb2c36; --my-var: 0 20px 25px -5px var(--color); }
    .test { box-shadow: var(--my-var); }
  `);

  // Since we can't directly test the hook in isolation with the render approach,
  // we'll test that a component using the variable gets the correct value
  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    boxShadow: [
      {
        blurRadius: 25,
        color: "#fb2c36",
        offsetX: 0,
        offsetY: 20,
        spreadDistance: -5,
      },
    ],
  });
});

test("shadow values - multiple", () => {
  // registerCSS(`
  //   :root { --color: #fb2c36; --my-var: 0 20px 25px -5px var(--color); }
  //   .test { box-shadow: var(--my-var), var(--my-var); }
  // `);

  registerCSS(`
    :root {
      --my-var: 0 20px 0 0 red, 0 30px 0 0 green;
      --my-var-2: var(--my-var), 0 40px 0 0 purple;
      --my-var-3: 0 50px 0 0 yellow, 0 60px 0 0 orange;
      --my-var-4: var(--my-var-3), 0 70px 0 0 gray;
    }
    .test {
      box-shadow: var(--my-var-2), var(--my-var-4);
    }
  `);

  // Since we can't directly test the hook in isolation with the render approach,
  // we'll test that a component using the variable gets the correct value
  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    boxShadow: [
      {
        blurRadius: 0,
        color: "red",
        offsetX: 0,
        offsetY: 20,
        spreadDistance: 0,
      },

      {
        blurRadius: 0,
        color: "green",
        offsetX: 0,
        offsetY: 30,
        spreadDistance: 0,
      },
      {
        blurRadius: 0,
        color: "purple",
        offsetX: 0,
        offsetY: 40,
        spreadDistance: 0,
      },
      {
        blurRadius: 0,
        color: "yellow",
        offsetX: 0,
        offsetY: 50,
        spreadDistance: 0,
      },
      {
        blurRadius: 0,
        color: "orange",
        offsetX: 0,
        offsetY: 60,
        spreadDistance: 0,
      },
      {
        blurRadius: 0,
        color: "gray",
        offsetX: 0,
        offsetY: 70,
        spreadDistance: 0,
      },
    ],
  });
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
