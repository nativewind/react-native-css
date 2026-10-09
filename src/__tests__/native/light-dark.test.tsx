import { act, render, screen } from "@testing-library/react-native";
import type { CompilerOptions } from "react-native-css/compiler";
import { TextInput } from "react-native-css/components/TextInput";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

const parentTestID = "parent";

// An arm is a colour, which may nest one function inside another: hsl(0 100% 50% / var(--a))
const ARGUMENT = String.raw`(?:[^(),]|\((?:[^()]|\([^()]*\))*\))+`;
const ARM = new RegExp(
  String.raw`light-dark\((${ARGUMENT}),\s*(${ARGUMENT})\)`,
  "g",
);

/** The same stylesheet with every `light-dark()` replaced by one of its arms */
const withArm = (css: string, arm: "light" | "dark"): string =>
  css.replaceAll(ARM, (_match, light: string, dark: string) =>
    arm === "light" ? light : dark,
  );

const renderTree = (css: string, options: CompilerOptions) => {
  registerCSS(css, options);

  const { unmount } = render(
    <View testID={parentTestID} className="p">
      <View testID={testID} className="a" />
    </View>,
  );

  const readStyles = () => ({
    parent: screen.getByTestId(parentTestID).props.style,
    element: screen.getByTestId(testID).props.style,
  });

  return { readStyles, unmount };
};

const scenes = [
  ["color", `.a { color: light-dark(#123456, #654321); }`],
  [
    "background-color",
    `.a { background-color: light-dark(#123456, #654321); }`,
  ],
  ["a border colour", `.a { border: 1px solid light-dark(#123456, #654321); }`],
  [
    "a shadow colour",
    `.a { box-shadow: 0 0 1px light-dark(#123456, #654321); }`,
  ],
  [
    "a text shadow colour",
    `.a { text-shadow: 1px 1px 1px light-dark(#123456, #654321); }`,
  ],
  [
    "a :root custom property",
    `:root { --ld-root: light-dark(#123456, #654321); } .a { color: var(--ld-root); }`,
  ],
  [
    "a universal custom property",
    `* { --ld-universal: light-dark(#123456, #654321); } .a { color: var(--ld-universal); }`,
  ],
  [
    "an ancestor's custom property",
    `.p { --x: light-dark(#123456, #654321); } .a { color: var(--x); }`,
  ],
  [
    "the element's own custom property",
    `.a { --x: light-dark(#123456, #654321); color: var(--x); }`,
  ],
  [
    "currentcolor from an ancestor",
    `.p { color: light-dark(#123456, #654321); } .a { border-width: 1px; border-color: currentcolor; }`,
  ],
  [
    "an ancestor's colour beside its other variables",
    `.p { --other: 5px; color: light-dark(#123456, #654321); } .a { width: var(--other); background-color: currentcolor; }`,
  ],
  [
    "two declarations on one rule",
    `.p { color: light-dark(#123456, #654321); background-color: light-dark(#111111, #222222); } .a { background-color: currentcolor; }`,
  ],
  [
    "a branch that reads a variable",
    `.p { --d: #654321; } .a { background-color: light-dark(#123456, var(--d)); }`,
  ],
  [
    "two branches that read a variable",
    `:root { --ld-alpha: 1; } .a { color: light-dark(hsl(0 100% 50% / var(--ld-alpha)), hsl(240 100% 50% / var(--ld-alpha))); background-color: light-dark(hsl(120 100% 25% / var(--ld-alpha)), hsl(60 100% 50% / var(--ld-alpha))); }`,
  ],
  ["!important", `.a { color: light-dark(#123456, #654321) !important; }`],
  [
    "a media query",
    `@media (min-width: 0px) { .a { color: light-dark(#123456, #654321); } }`,
  ],
] as const;

// CSS Color 5 §7: light-dark() is its first colour unless the used colour scheme is dark
describe.each([
  ["on", {}],
  ["off", { inlineVariables: false }],
] as const satisfies readonly (readonly [string, CompilerOptions])[])(
  "with inline variables %s",
  (_mode, options) => {
    test.each(scenes)(
      "%s renders its light colour, then its dark colour",
      (_name, css) => {
        act(() => {
          colorScheme.set("light");
        });

        const expected = (arm: "light" | "dark") => {
          const tree = renderTree(withArm(css, arm), options);
          const styles = tree.readStyles();
          tree.unmount();
          return styles;
        };

        const lightStyles = expected("light");
        const darkStyles = expected("dark");

        expect(darkStyles).not.toStrictEqual(lightStyles);

        const tree = renderTree(css, options);

        expect(tree.readStyles()).toStrictEqual(lightStyles);

        act(() => {
          colorScheme.set("dark");
        });

        expect(tree.readStyles()).toStrictEqual(darkStyles);

        act(() => {
          colorScheme.set("light");
        });

        expect(tree.readStyles()).toStrictEqual(lightStyles);
      },
    );
  },
);

test("a pseudo-element's light-dark() reaches its prop, never the element", () => {
  registerCSS(`.a::placeholder { color: light-dark(#123456, #654321); }`);
  render(<TextInput testID={testID} className="a" />);
  const component = screen.getByTestId(testID);

  expect(component.props.placeholderTextColor).toBe("#123456");

  act(() => {
    colorScheme.set("dark");
  });

  expect(component.props.placeholderTextColor).toBe("#654321");
  expect(component.props.style).toStrictEqual({});
});
