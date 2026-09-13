import { act, render, screen } from "@testing-library/react-native";
import { vars } from "react-native-css";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

import { dimensions } from "../../native/reactivity";

/**
 * Every test names its own custom properties. `:root` variables live in a
 * store the jest `beforeEach` does not reset, so a shared name would let one
 * test decide another's result depending on the order they ran in.
 *
 * Native plane. `../compiler/inline-variables.test.ts` asserts the same folds
 * against the IR; these assert what the runtime paints, because an IR that is
 * scoped correctly and a screen that renders correctly are two claims.
 */

test("a class-scoped variable does not leak into an unrelated rule", () => {
  registerCSS(`.parent { --leak-a: 10px; } .child { width: var(--leak-a); }`);

  render(<View testID={testID} className="child" />);

  // No `.parent` anywhere above it, so there is no `--leak-a` to read.
  expect(screen.getByTestId(testID).props.style).toStrictEqual({});
});

test("a class-scoped variable still reaches a descendant", () => {
  registerCSS(`.parent { --leak-b: 10px; } .child { width: var(--leak-b); }`);

  render(
    <View className="parent">
      <View testID={testID} className="child" />
    </View>,
  );

  // The declaration has to survive the fold for this to resolve at all.
  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("a variable's own value does not leak across blocks", () => {
  registerCSS(
    `.a { --nest-a: var(--nest-b); width: var(--nest-a); } .b { --nest-b: 10px; }`,
  );

  render(<View testID={testID} className="a" />);

  // `--nest-b` belongs to `.b`. An element carrying only `.a` never had it.
  expect(screen.getByTestId(testID).props.style).toStrictEqual({});
});

test("a conditional :root does not fold into an unconditional rule", () => {
  registerCSS(`
    @media (min-width: 1000px) { :root { --cond-off: 10px; } }
    .child { width: var(--cond-off); }
  `);

  act(() => {
    dimensions.set({ width: 500, height: 500, scale: 1, fontScale: 1 });
  });
  render(<View testID={testID} className="child" />);

  // The declaration does not apply at this width, so neither does the value.
  expect(screen.getByTestId(testID).props.style).toStrictEqual({});
});

test("a conditional :root still applies when its query matches", () => {
  registerCSS(`
    @media (min-width: 1000px) { :root { --cond-on: 10px; } }
    .child { width: var(--cond-on); }
  `);

  act(() => {
    dimensions.set({ width: 1200, height: 500, scale: 1, fontScale: 1 });
  });
  render(<View testID={testID} className="child" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("a property registered with inherits: false resolves at runtime", () => {
  registerCSS(`
    @property --registered { syntax: "<length>"; inherits: false; initial-value: 10px; }
    :root { --registered: 20px; }
    .b { width: var(--registered); }
  `);

  render(<View testID={testID} className="b" />);

  // KNOWN LIMIT, pinned rather than claimed correct. CSS says `--registered`
  // does not inherit, so `.b` holds the registered initial value 10, not `:root`'s
  // 20. The compiler now refuses to fold it — the sibling compiler test pins
  // that — but the runtime carries no notion of a non-inherited custom
  // property, so it still resolves 20 from the root scope. Modelling
  // `inherits: false` in the variable store is what closes this, and refusing
  // the fold is the prerequisite rather than the fix.
  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 20 });
});

test("a runtime write reaches a rule that reads the variable", () => {
  registerCSS(`.parent { --write-a: red; } .child { color: var(--write-a); }`);

  render(
    <View
      className="parent"
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- `vars` is the inline-style write this test is ABOUT: it is the only API that puts a variable on the element itself, which is what outranks a class declaration. `VariableContextProvider`, its replacement, supplies an ancestor scope and cannot express the case.
      style={vars({ "--write-a": "blue" })}
    >
      <View testID={testID} className="child" />
    </View>,
  );

  // An inline write outranks a class declaration, and folding the class value
  // into `.child` would have made that unrepresentable.
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "blue",
  });
});

test("a runtime write cannot reach a reference in the declaring block", () => {
  registerCSS(`.a { --write-b: red; color: var(--write-b); }`);

  render(
    <View
      testID={testID}
      className="a"
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- as above: the inline write is the subject.
      style={vars({ "--write-b": "blue" })}
    />,
  );

  // KNOWN LIMIT, pinned rather than claimed correct. CSS says the inline write
  // wins and this should be blue. The value was folded at build time, so no
  // read remains for the write to affect. Closing it means not folding a
  // same-block reference either, which is the whole optimisation; `blue`
  // is recoverable today with `inlineVariables: { exclude: [...] }`.
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#f00",
  });
});

test("excluding a variable restores the runtime write", () => {
  registerCSS(`.a { --write-c: red; color: var(--write-c); }`, {
    inlineVariables: { exclude: ["--write-c"] },
  });

  render(
    <View
      testID={testID}
      className="a"
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- as above: the inline write is the subject.
      style={vars({ "--write-c": "blue" })}
    />,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "blue",
  });
});
