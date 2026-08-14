import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { VariableContextProvider } from "react-native-css/native";

/**
 * The end-to-end half of `font-family-stack.test.ts`: a stack written in CSS
 * has to reach the props as one family name whichever route it takes through
 * the compiler, and a `var()` is the route that only resolves at render.
 *
 * A variable is declared twice in each `var()` case on purpose — a variable
 * with a single definition is inlined by the compiler, which narrows it there
 * and never exercises the runtime.
 */

const styleOf = (className: string, css: string): unknown => {
  registerCSS(css);
  render(<View testID={testID} className={className} />);
  return screen.getByTestId(testID).props.style;
};

test("a var() holding a stack arrives as one family", () => {
  expect(
    styleOf(
      "a",
      `:root { --stack: Inter, Helvetica; }
       .other { --stack: Georgia, serif; }
       .a { font-family: var(--stack); }`,
    ),
  ).toStrictEqual({ fontFamily: "Inter" });
});

test("a static stack the compiler could not type arrives as one family", () => {
  // The trailing comma is what pushes this declaration onto the unparsed path.
  // It never reaches `applyValue` — `applyDeclarations` copies a static style
  // straight onto the target — so the runtime reduction cannot save it and the
  // compiler has to.
  expect(styleOf("a", `.a { font-family: Inter, Helvetica,; }`)).toStrictEqual({
    fontFamily: "Inter",
  });
});

test("a static stack with nothing usable produces no style at all", () => {
  // The compiler drops the declaration, and it was the rule's only one.
  expect(styleOf("a", `.a { font-family: ,; }`)).toBeUndefined();
});

test("a var() holding something that cannot name a family sets no family", () => {
  expect(
    styleOf(
      "a",
      `:root { --n: 12; } .other { --n: 13; } .a { font-family: var(--n); }`,
    ),
  ).toStrictEqual({});
});

test("a var() that resolves to nothing falls through to the next family", () => {
  expect(
    styleOf("a", `.a { font-family: var(--missing), Helvetica; }`),
  ).toStrictEqual({ fontFamily: "Helvetica" });
});

test("a function that resolves to something unusable falls through too", () => {
  // Not every deferred head is a `var()`. `calc()` resolves to a number, which
  // is skipped at render for the same reason `12` is skipped at compile time.
  expect(styleOf("a", `.a { font-family: calc(1px), Inter; }`)).toStrictEqual({
    fontFamily: "Inter",
  });
});

test("a stack supplied at render arrives as one family, and stays current", () => {
  // A variable set at render rather than in the stylesheet takes the same
  // route, and it is the one a stack can be written into directly.
  registerCSS(`.a { font-family: var(--stack); }`);

  render(
    <VariableContextProvider value={{ "--stack": ["Inter", "Helvetica"] }}>
      <View testID={testID} className="a" />
    </VariableContextProvider>,
  );
  const element = screen.getByTestId(testID);
  expect(element.props.style).toStrictEqual({ fontFamily: "Inter" });

  screen.rerender(
    <VariableContextProvider value={{ "--stack": ["Georgia", "serif"] }}>
      <View testID={testID} className="a" />
    </VariableContextProvider>,
  );
  expect(element.props.style).toStrictEqual({ fontFamily: "Georgia" });
});
