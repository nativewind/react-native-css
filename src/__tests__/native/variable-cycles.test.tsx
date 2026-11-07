import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { useUnstableNativeVariable } from "react-native-css/native";

// Current CSS substitution rules ignore unused fallback cycles.
// https://github.com/w3c/csswg-drafts/issues/11500
test.each([
  ["self reference", "--a: var(--a)", 37],
  ["self reference with an internal fallback", "--a: var(--a, 12px)", 37],
  ["mutual reference", "--a: var(--b); --b: var(--a)", 37],
  [
    "mutual reference with an internal fallback",
    "--a: var(--b); --b: var(--a, 12px)",
    37,
  ],
  ["valid chain", "--a: var(--b); --b: 20px", 20],
  ["missing variable fallback", "--b: 20px", 37],
  ["cycle in an unused fallback", "--a: var(--b, var(--a)); --b: 20px", 20],
  [
    "acyclic fallback dependency",
    "--a: var(--b, var(--c)); --b: 20px; --c: 30px",
    20,
  ],
])("resolves %s without recursive failure", (_name, declarations, expected) => {
  registerCSS(`.sample { ${declarations}; width: var(--a, 37px); }`, {
    inlineVariables: false,
  });
  render(<View testID="sample" className="sample" />);
  expect(screen.getByTestId("sample").props.style).toStrictEqual({
    width: expected,
  });
});

test("a variable outside a cycle can use a fallback for the invalid variable", () => {
  registerCSS(
    `.sample { --a: var(--b); --b: var(--a); --c: var(--a, 42px); width: var(--c); }`,
    { inlineVariables: false },
  );
  render(<View testID="sample" className="sample" />);
  expect(screen.getByTestId("sample").props.style).toStrictEqual({ width: 42 });
});

test("repeated sibling variable references are not cycles", () => {
  registerCSS(`.sample { --a: 20px; width: calc(var(--a) + var(--a)); }`, {
    inlineVariables: false,
  });
  render(<View testID="sample" className="sample" />);
  expect(screen.getByTestId("sample").props.style).toStrictEqual({ width: 40 });
});

const nested = (
  <View className="parent">
    <View className="mid">
      <View testID="child" className="child" />
    </View>
  </View>
);

// A variable reaches a descendant unresolved, so these cycles close on the element that reads them
test.each([
  ["a variable whose value is itself", ".mid { --a: var(--a); }"],
  [
    "a variable reached again through a fallback",
    ".mid { --a: var(--nope, var(--a, blue)); }",
  ],
  [
    "two variables that name each other",
    ".mid { --a: var(--b); --b: var(--a); }",
  ],
  [
    "one variable reached again from two branches of one value",
    ".mid { --a: var(--b) var(--c); --b: var(--a); --c: var(--a); }",
  ],
])("%s, inherited, drops the reading declaration", (_name, cycle) => {
  registerCSS(
    `.parent { --a: red; --b: blue; --c: green; --unrelated: 1; }
     ${cycle}
     .mid { --unrelated: 0.5; }
     .child { color: var(--a); opacity: var(--unrelated); }`,
    { inlineVariables: false },
  );
  render(nested);
  expect(screen.getByTestId("child").props.style).toStrictEqual({
    opacity: 0.5,
  });
});

test("an inherited variable read twice in one declaration is not a cycle", () => {
  registerCSS(
    `.parent { --shadow-color: red; }
     .child { box-shadow: var(--shadow-color) 1px 1px, var(--shadow-color) 2px 2px; }`,
    { inlineVariables: false },
  );
  render(nested);
  expect(screen.getByTestId("child").props.style).toStrictEqual({
    boxShadow: [
      { color: "red", offsetX: 1, offsetY: 1 },
      { color: "red", offsetX: 2, offsetY: 2 },
    ],
  });
});

test("an inherited non-circular chain resolves through every step", () => {
  registerCSS(
    `.parent { --a: var(--b); --b: var(--c); --c: var(--d); --d: red; }
     .child { color: var(--a); }`,
    { inlineVariables: false },
  );
  render(nested);
  expect(screen.getByTestId("child").props.style).toStrictEqual({
    color: "red",
  });
});

test("a cycle in a variable declared once is cut by the compiler", () => {
  registerCSS(
    `.mid { --unrelated: 0.5; }
     .child { --z: var(--z); width: var(--z); opacity: var(--unrelated); }`,
  );
  render(nested);
  expect(screen.getByTestId("child").props.style).toStrictEqual({
    opacity: 0.5,
  });
});

test("useUnstableNativeVariable reads a cycle as no value", () => {
  registerCSS(`.parent { --a: red; } .mid { --a: var(--a); }`, {
    inlineVariables: false,
  });

  let read: unknown = "not read";

  function Probe() {
    read = useUnstableNativeVariable("--a");
    return <View />;
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
