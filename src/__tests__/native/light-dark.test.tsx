import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

afterEach(() => {
  act(() => {
    colorScheme.set("light");
  });
});

describe("two light-dark() declarations on one rule", () => {
  /**
   * A `var()` anywhere inside `light-dark()` keeps the colour unresolved, which
   * is the path that opens the dark rule from the current rule rather than from
   * an empty one — so the second declaration's dark rule re-asserts the first
   * declaration's light value over the dark one already set.
   */
  const css = `
:root { --a: 1; }
.my-class {
  color: light-dark(hsl(0 100% 50% / var(--a)), hsl(240 100% 50% / var(--a)));
  background-color: light-dark(hsl(120 100% 25% / var(--a)), hsl(60 100% 50% / var(--a)));
}`;

  test("light mode takes both light branches", () => {
    registerCSS(css);
    render(<View testID={testID} className="my-class" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      color: "hsl(0, 100, 50)",
      backgroundColor: "hsl(120, 100, 25)",
    });
  });

  test("dark mode takes both dark branches", () => {
    registerCSS(css);
    render(<View testID={testID} className="my-class" />);

    act(() => {
      colorScheme.set("dark");
    });

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      color: "hsl(240, 100, 50)",
      backgroundColor: "hsl(60, 100, 50)",
    });
  });
});

describe("a light-dark() branch that reads a variable", () => {
  /**
   * Only the dark branch reads a variable, so resolving it is the extra rule's
   * own requirement — the rule it copies has no delayed declaration to inherit
   * the flag from.
   */
  const css = `
.parent { --d: blue; }
.my-class { background-color: light-dark(red, var(--d)); }
.plain { background-color: var(--d); }`;

  const renderTree = () => {
    // The variable has to survive compilation for the runtime to resolve it.
    registerCSS(css, { inlineVariables: false });
    render(
      <View className="parent">
        <View testID={testID} className="my-class" />
        <View testID="plain" className="plain" />
      </View>,
    );
  };

  test("light mode takes the static branch", () => {
    renderTree();

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      backgroundColor: "red",
    });
  });

  test("dark mode resolves the variable branch", () => {
    renderTree();

    act(() => {
      colorScheme.set("dark");
    });

    // Stated against the same variable read outside light-dark(), so the test
    // pins that the branch resolves rather than how the value stringifies.
    expect(screen.getByTestId(testID).props.style).toStrictEqual(
      screen.getByTestId("plain").props.style,
    );
    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      backgroundColor: "blue",
    });
  });
});

describe("a light-dark() colour is inherited per colour scheme", () => {
  const css = `
.parent { color: light-dark(red, blue); }
.child { background-color: currentcolor; }`;

  const renderTree = () => {
    registerCSS(css);
    render(
      <View testID="parent" className="parent">
        <View testID="child" className="child" />
      </View>,
    );
  };

  test("light mode hands descendants the light colour", () => {
    renderTree();

    expect(screen.getByTestId("parent").props.style).toStrictEqual({
      color: "#f00",
    });
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      backgroundColor: "#f00",
    });
  });

  test("dark mode hands descendants the dark colour", () => {
    renderTree();

    act(() => {
      colorScheme.set("dark");
    });

    expect(screen.getByTestId("parent").props.style).toStrictEqual({
      color: "#00f",
    });
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      backgroundColor: "#00f",
    });
  });
});

describe("a light-dark() colour leaves the rule's other variables alone", () => {
  /**
   * The dark rule restates only the variable its own branch changes. The rule
   * it copies matches under `prefers-color-scheme: dark` too, so every other
   * variable still reaches descendants from there.
   */
  const css = `
.parent { --other: 5px; color: light-dark(red, blue); }
.child { width: var(--other); background-color: currentcolor; }`;

  const renderTree = () => {
    registerCSS(css, { inlineVariables: false });
    render(
      <View testID="parent" className="parent">
        <View testID="child" className="child" />
      </View>,
    );
  };

  test("light mode", () => {
    renderTree();

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      width: 5,
      backgroundColor: "#f00",
    });
  });

  test("dark mode keeps the untouched variable and swaps the colour", () => {
    renderTree();

    act(() => {
      colorScheme.set("dark");
    });

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      width: 5,
      backgroundColor: "#00f",
    });
  });
});
