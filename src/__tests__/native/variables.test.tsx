import { memo, useEffect } from "react";
import type { ViewProps } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { styled } from "react-native-css";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
// The native entry, so the provider's value type is the native
// `StyleDescriptor` one rather than web's `string | number`.
import {
  useUnstableNativeVariable,
  VariableContextProvider,
} from "react-native-css/native";

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
 * A variable is handed to a descendant as an UNRESOLVED descriptor, so a value
 * that names its own variable resolves back into itself. Without a cycle guard
 * that survives the recursion, the descendant blows the stack instead of
 * rendering.
 */
describe("circular variables", () => {
  /**
   * Every row closes a cycle on `--a` and reads it from `.child`, beside a
   * NON-cyclic `--unrelated` that has to keep resolving. The second read is
   * what makes the assertion falsifiable: a row that only asserts the cycle
   * produced nothing passes just as green when variable resolution is dead
   * altogether.
   *
   * Every name is declared TWICE because the compiler substitutes a variable
   * declared exactly once directly into its readers. A single declaration
   * folds the cycle away before the runtime resolver these rows exist to
   * exercise ever sees it, leaving a row that reads as one shape and compiles
   * to another.
   */
  const circularStylesheets: [
    name: string,
    css: string,
    style: Record<string, unknown>,
  ][] = [
    [
      "a variable whose value is itself",
      `.parent { --a: red;      --unrelated: 1 }
       .mid    { --a: var(--a); --unrelated: 0.5 }
       .child  { color: var(--a); opacity: var(--unrelated) }`,
      { opacity: 0.5 },
    ],
    [
      // The inner `blue` is the point: a cycle is invalid at computed-value
      // time, so the cut yields nothing rather than the fallback of the
      // reference that re-entered it.
      "a variable reached again through a fallback",
      `.parent { --a: red;                        --unrelated: 1 }
       .mid    { --a: var(--nope, var(--a, blue)); --unrelated: 0.5 }
       .child  { color: var(--a); opacity: var(--unrelated) }`,
      { opacity: 0.5 },
    ],
    [
      "two variables that name each other",
      `.parent { --a: red;      --b: blue;    --unrelated: 1 }
       .mid    { --a: var(--b); --b: var(--a); --unrelated: 0.5 }
       .child  { color: var(--a); opacity: var(--unrelated) }`,
      { opacity: 0.5 },
    ],
    [
      // Two branches of ONE value re-enter the same name. Cutting the first
      // branch has to pop only its own frame — a guard that empties the whole
      // stack lets the second branch start over and recurse forever.
      "one variable re-entered from two branches of one value",
      `.parent { --a: red;               --b: blue;     --c: green;    --unrelated: 1 }
       .mid    { --a: var(--b) var(--c); --b: var(--a); --c: var(--a); --unrelated: 0.5 }
       .child  { color: var(--a); opacity: var(--unrelated) }`,
      // The cycle is only part of `--a`, so `color` keeps the surviving
      // siblings rather than losing the declaration.
      { color: [], opacity: 0.5 },
    ],
  ];

  test("the census is not empty", () => {
    expect(circularStylesheets.length).toBeGreaterThan(0);
  });

  test.each(circularStylesheets)("%s renders", (_name, css, style) => {
    registerCSS(css);

    render(
      <View className="parent">
        <View className="mid">
          <View testID={testID} className="child" />
        </View>
      </View>,
    );

    expect(screen.getByTestId(testID).props.style).toStrictEqual(style);
  });

  test("a variable read twice in ONE declaration is not mistaken for a cycle", () => {
    // Both reads share one resolution pass, so the guard has to track names
    // whose resolution is IN PROGRESS rather than names already seen.
    // `inlineVariables` is off so the reads survive to runtime instead of being
    // folded at compile time, as a provider or :root variable does.
    registerCSS(
      `
      .parent { --shadow-color: red }
      .child {
        box-shadow:
          var(--shadow-color) 1px 1px,
          var(--shadow-color) 2px 2px;
      }
    `,
      { inlineVariables: false },
    );

    render(
      <View className="parent">
        <View testID={testID} className="child" />
      </View>,
    );

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      boxShadow: [
        { color: "red", offsetX: 1, offsetY: 1 },
        { color: "red", offsetX: 2, offsetY: 2 },
      ],
    });
  });

  test("a long non-circular chain still resolves", () => {
    registerCSS(
      `
      .parent { --a: var(--b); --b: var(--c); --c: var(--d); --d: red }
      .child { color: var(--a) }
    `,
      { inlineVariables: false },
    );

    render(
      <View className="parent">
        <View testID={testID} className="child" />
      </View>,
    );

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      color: "red",
    });
  });

  test("a cycle in a variable declared ONCE is cut at compile time", () => {
    // A variable declared once is substituted into its readers, so this cycle
    // is closed by the compiler's own guard in `inline-variables.ts` and never
    // reaches the resolution stack above.
    registerCSS(
      `.parent { --unrelated: 1 }
       .mid    { --unrelated: 0.5 }
       .child  { --z: var(--z); width: var(--z); opacity: var(--unrelated) }`,
    );

    render(
      <View className="parent">
        <View className="mid">
          <View testID={testID} className="child" />
        </View>
      </View>,
    );

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      opacity: 0.5,
    });
  });

  test("useUnstableNativeVariable reads a cycle without recursing", () => {
    registerCSS(`.parent { --a: red } .mid { --a: var(--a) }`);

    let read: unknown = "not read";

    function Probe() {
      read = useUnstableNativeVariable("--a");
      return <View testID={testID} />;
    }

    render(
      <View className="parent">
        <View className="mid">
          <Probe />
        </View>
      </View>,
    );

    expect(read).toBeUndefined();
  });

  test("VariableContextProvider accepts a self-referential value", () => {
    // The provider's value type admits a `var()` reference, so a caller can
    // hand it a variable that names itself.
    registerCSS(`.child { color: var(--a); opacity: var(--unrelated) }`);

    render(
      <VariableContextProvider
        value={{ "--a": [{}, "var", "a"], "--unrelated": 0.5 }}
      >
        <View testID={testID} className="child" />
      </VariableContextProvider>,
    );

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      opacity: 0.5,
    });
  });
});
