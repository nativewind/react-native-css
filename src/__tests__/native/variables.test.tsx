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

// Chromium 153, Firefox 155 and WebKit 26.6 read a custom property's name as its own, never as a property every object inherits
test.each(["constructor", "toString", "hasOwnProperty"])(
  "var(--%s) with no declaration takes its fallback",
  (name) => {
    registerCSS(`
      .parent { --unrelated: 1px; }
      .other { --unrelated: 2px; }
      .test { color: var(--${name}, green); }
    `);

    render(
      <View className="parent">
        <View testID={testID} className="test" />
      </View>,
    );

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      color: "green",
    });
  },
);

test("var(--constructor) reads the ancestor's declaration", () => {
  registerCSS(`
    .parent { --constructor: blue; }
    .other { --constructor: red; }
    .test { color: var(--constructor); }
  `);

  render(
    <View className="parent">
      <View testID={testID} className="test" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "blue",
  });
});

// Chromium 153, Firefox 155 and WebKit 26.6 make each member of a cycle the guaranteed-invalid value (css-variables-1 §2.3), wherever it is declared
test.each([
  ["*", "universal-cycle"],
  [":root", "root-cycle"],
])("a cycle declared on %s leaves var() its fallback", (selector, name) => {
  registerCSS(`
    ${selector} { --${name}-a: var(--${name}-b); --${name}-b: var(--${name}-a); }
    .other { --${name}-a: 1px; --${name}-b: 1px; }
    .test { color: var(--${name}-a, green); }
  `);

  render(<View testID={testID} className="test" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "green",
  });
});

// Chromium 153, Firefox 155 and WebKit 26.6 compute a variable read inside a function from the variable's own computed value, wherever either is declared
test.each([
  [
    "after",
    ".child { --order-source: 3px; --order-middle: var(--order-source); --order-reader: calc(var(--order-middle) * 2); width: var(--order-reader, 5px); }",
  ],
  [
    "before",
    ".child { --order-reader: calc(var(--order-middle) * 2); --order-middle: var(--order-source); --order-source: 3px; width: var(--order-reader, 5px); }",
  ],
  [
    "inside an undeclared variable's fallback, before",
    ".child { --order-reader: var(--order-absent, calc(var(--order-middle) * 2)); --order-middle: var(--order-source); --order-source: 3px; width: var(--order-reader); }",
  ],
])(
  "a variable read inside a function declared %s the chain it reads resolves through it",
  (_order, css) => {
    registerCSS(css);

    render(<View testID={testID} className="child" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 6 });
  },
);

// Chromium 153, Firefox 155 and WebKit 26.6 give every member of a cycle the guaranteed-invalid value however few rules declare it, and resolve a variable two branches read in both
test.each([
  [
    "a cycle declared once leaves var() its fallback",
    ".child { --cycle-once-a: var(--cycle-once-b); --cycle-once-b: var(--cycle-once-a); color: var(--cycle-once-b, green); }",
    { color: "green" },
  ],
  [
    "a cycle read twice in one declaration takes each fallback",
    ".child { --cycle-x: var(--cycle-y); --cycle-y: var(--cycle-x); width: calc(var(--cycle-x, 2px) + var(--cycle-x, 3px)); } .other { --cycle-x: 1px; --cycle-y: 1px; }",
    { width: 5 },
  ],
  [
    "a variable two branches read is no cycle",
    ".child { --diamond-reader: calc(var(--diamond-left) + var(--diamond-right)); --diamond-left: var(--diamond-base); --diamond-right: var(--diamond-base); --diamond-base: 3px; width: var(--diamond-reader, 1px); }",
    { width: 6 },
  ],
])("%s", (_name, css, style) => {
  registerCSS(css);

  render(<View testID={testID} className="child" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual(style);
});

// Chromium 153, Firefox 155 and WebKit 26.6 read a variable the same way whether or not the compiler inlines it
describe.each([
  ["inlined", {}],
  ["kept", { inlineVariables: false }],
] as const)("with every variable %s", (_route, options) => {
  // css-variables-1 §2.3, §3.1: a value that reads the guaranteed-invalid value is the guaranteed-invalid value, so var() takes its fallback
  test.each([
    [
      "a cycle",
      ".child { --cycle-a: var(--cycle-b); --cycle-b: var(--cycle-a); --cycle-reader: var(--cycle-a) 2px; width: var(--cycle-reader, 5px); }",
    ],
    [
      "a variable no rule gives the element",
      ".child { --theme-reader: var(--theme) 2px; width: var(--theme-reader, 5px); } .light { --theme: 1px; } .dark { --theme: 2px; }",
    ],
  ])(
    "a variable whose value reads %s leaves var() its fallback",
    (_reads, css) => {
      registerCSS(css, options);

      render(<View testID={testID} className="child" />);

      expect(screen.getByTestId(testID).props.style).toStrictEqual({
        width: 5,
      });
    },
  );

  test("a variable two rules declare is read from the rule that applies, through one declared once", () => {
    registerCSS(
      ".child { --size-reader: var(--size); width: var(--size-reader, 5px); } .small { --size: 3px; } .large { --size: 4px; }",
      options,
    );

    render(<View testID={testID} className="child large" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 4 });
  });

  // css-variables-1 §3.1: a value a var() substitutes that the property cannot take leaves the declaration invalid at computed-value time, as if it were `unset`; written, the same value is ignored
  test.each(["", " !important"])(
    "a substituted value the property cannot take resets it%s, where the earlier rule's would stand if it were written",
    (importance) => {
      registerCSS(
        `.first { text-shadow: 9px 9px 0 #010203${importance} } .second { --shadow: 2px; text-shadow: var(--shadow)${importance} }`,
        options,
      );

      render(<View testID={testID} className="first second" />);

      expect(screen.getByTestId(testID).props.style).toStrictEqual({
        textShadowColor: undefined,
        textShadowOffset: undefined,
        textShadowRadius: undefined,
      });
    },
  );
});
