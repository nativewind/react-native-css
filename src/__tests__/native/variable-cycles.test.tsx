import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

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
