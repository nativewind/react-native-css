import { act, render, screen } from "@testing-library/react-native";
import type { CompilerOptions } from "react-native-css/compiler";
import { TextInput } from "react-native-css/components/TextInput";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import {
  rootVariables,
  StyleCollection,
  universalVariables,
} from "react-native-css/native-internal";
import { colorScheme } from "react-native-css/runtime";
import { COLOR_SCHEME_VARIABLE } from "react-native-css/utilities";

type Arm = "light" | "dark";

const grandparentTestID = "grandparent";
const parentTestID = "parent";

// An arm is a colour, which may nest one function inside another: hsl(0 100% 50% / var(--a))
const ARGUMENT = String.raw`(?:[^(),]|\((?:[^()]|\([^()]*\))*\))+`;
const ARM = new RegExp(
  String.raw`light-dark\((${ARGUMENT}),\s*(${ARGUMENT})\)`,
  "g",
);

/** The same stylesheet with every `light-dark()` replaced by one of its arms, a nested one included */
const withArm = (css: string, arm: Arm): string => {
  const replaced = css.replaceAll(ARM, (_match, light: string, dark: string) =>
    arm === "light" ? light : dark,
  );

  return replaced === css ? css : withArm(replaced, arm);
};

// registerCSS keeps every :root and * variable between tests, and this channel has one fixed name
beforeEach(() => {
  rootVariables(COLOR_SCHEME_VARIABLE).set([]);
  universalVariables(COLOR_SCHEME_VARIABLE).set([]);
});

const inlineVariableModes = [
  ["on", {}],
  ["off", { inlineVariables: false }],
] as const satisfies readonly (readonly [string, CompilerOptions])[];

const renderTree = (css: string, options: CompilerOptions) => {
  registerCSS(css, options);

  const { unmount } = render(
    <View testID={grandparentTestID} className="g">
      <View testID={parentTestID} className="p">
        <View testID={testID} className="a" />
      </View>
    </View>,
  );

  const readStyles = () => ({
    grandparent: screen.getByTestId(grandparentTestID).props.style,
    parent: screen.getByTestId(parentTestID).props.style,
    element: screen.getByTestId(testID).props.style,
  });

  return { readStyles, unmount };
};

const renderedStyles = (css: string, options: CompilerOptions) => {
  const tree = renderTree(css, options);
  const styles = tree.readStyles();
  tree.unmount();
  return styles;
};

// CSS Color Adjust 1 §2.3: an element that supports both schemes uses the preferred one
const SUPPORTS_BOTH_SCHEMES = ":root { color-scheme: light dark; }";

const scenes = [
  ["color", `.a { color: light-dark(#123456, #654321); }`],
  [
    "background-color",
    `.a { background-color: light-dark(#123456, #654321); }`,
  ],
  ["a border colour", `.a { border: 1px solid light-dark(#123456, #654321); }`],
  [
    "four border colours",
    `.a { border-width: 1px; border-color: light-dark(#111111, #222222) light-dark(#333333, #444444) light-dark(#555555, #666666) light-dark(#777777, #888888); }`,
  ],
  [
    "the inline border colours",
    `.a { border-width: 1px; border-inline-color: light-dark(#123456, #654321) light-dark(#111111, #222222); }`,
  ],
  [
    "one border side",
    `.a { border-top: 1px solid light-dark(#123456, #654321); }`,
  ],
  [
    "the block border",
    `.a { border-block: 1px solid light-dark(#123456, #654321); }`,
  ],
  [
    "the inline-start border",
    `.a { border-inline-start: 1px solid light-dark(#123456, #654321); }`,
  ],
  ["outline-color", `.a { outline-color: light-dark(#123456, #654321); }`],
  [
    "text-decoration-color",
    `.a { text-decoration-line: underline; text-decoration-color: light-dark(#123456, #654321); }`,
  ],
  [
    "the text-decoration shorthand",
    `.a { text-decoration: underline light-dark(#123456, #654321); }`,
  ],
  [
    "a shadow colour",
    `.a { box-shadow: 0 0 1px light-dark(#123456, #654321); }`,
  ],
  [
    "a text shadow colour",
    `.a { text-shadow: 1px 1px 1px light-dark(#123456, #654321); }`,
  ],
  [
    "a nested light-dark()",
    `.a { color: light-dark(light-dark(#123456, #654321), #778899); }`,
  ],
  [
    "a var() fallback",
    `.a { color: var(--ld-missing, light-dark(#123456, #654321)); }`,
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

// CSS Color 5 §7: light-dark() is its first colour unless the element's used colour scheme is dark
describe.each(inlineVariableModes)(
  "with inline variables %s",
  (_mode, options) => {
    test.each(scenes)(
      "%s renders its light colour, then its dark colour",
      (_name, scene) => {
        const css = `${SUPPORTS_BOTH_SCHEMES} ${scene}`;

        act(() => {
          colorScheme.set("light");
        });

        const lightStyles = renderedStyles(withArm(css, "light"), options);
        const darkStyles = renderedStyles(withArm(css, "dark"), options);

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

const followsPreference = { light: "light", dark: "dark" } as const;
const alwaysLight = { light: "light", dark: "light" } as const;
const alwaysDark = { light: "dark", dark: "dark" } as const;

// The arm each scene takes under each preference is the one Chromium 153, Firefox 155 and WebKit 26.6 render
const colorSchemeScenes = [
  [
    "no color-scheme",
    `.a { color: light-dark(#123456, #654321); }`,
    alwaysLight,
  ],
  [
    "color-scheme: normal",
    `:root { color-scheme: normal; } .a { color: light-dark(#123456, #654321); }`,
    alwaysLight,
  ],
  [
    "color-scheme: light dark",
    `:root { color-scheme: light dark; } .a { color: light-dark(#123456, #654321); }`,
    followsPreference,
  ],
  [
    "color-scheme: dark light",
    `:root { color-scheme: dark light; } .a { color: light-dark(#123456, #654321); }`,
    followsPreference,
  ],
  [
    "color-scheme: only light dark",
    `:root { color-scheme: only light dark; } .a { color: light-dark(#123456, #654321); }`,
    followsPreference,
  ],
  [
    "color-scheme: dark on the element",
    `.a { color-scheme: dark; color: light-dark(#123456, #654321); }`,
    alwaysDark,
  ],
  [
    "color-scheme: light on the element, under a root that supports both",
    `:root { color-scheme: light dark; } .a { color-scheme: light; color: light-dark(#123456, #654321); }`,
    alwaysLight,
  ],
  [
    "color-scheme: only light",
    `:root { color-scheme: only light; } .a { color: light-dark(#123456, #654321); }`,
    alwaysLight,
  ],
  [
    "color-scheme: only dark",
    `:root { color-scheme: only dark; } .a { color: light-dark(#123456, #654321); }`,
    alwaysDark,
  ],
  [
    "color-scheme inherited from an ancestor",
    `.p { color-scheme: dark; } .a { color: light-dark(#123456, #654321); }`,
    alwaysDark,
  ],
  [
    "color-scheme: normal under a dark ancestor",
    `.p { color-scheme: dark; } .a { color-scheme: normal; color: light-dark(#123456, #654321); }`,
    alwaysLight,
  ],
  [
    "a custom ident alone",
    `:root { color-scheme: brand; } .a { color: light-dark(#123456, #654321); }`,
    alwaysLight,
  ],
  [
    "a custom ident beside dark",
    `:root { color-scheme: brand dark; } .a { color: light-dark(#123456, #654321); }`,
    alwaysDark,
  ],
  [
    "the later color-scheme",
    `.a { color-scheme: dark; color: light-dark(#123456, #654321); } .a { color-scheme: light; }`,
    alwaysLight,
  ],
  [
    "an !important color-scheme",
    `.a { color-scheme: dark !important; color: light-dark(#123456, #654321); } .a { color-scheme: light; }`,
    alwaysDark,
  ],
  [
    "a color-scheme in a media query",
    `.a { color: light-dark(#123456, #654321); } @media (min-width: 0px) { .a { color-scheme: dark; } }`,
    alwaysDark,
  ],
  [
    "a custom property resolved where it is used",
    `.p { color-scheme: dark; --x: light-dark(#123456, #654321); } .a { color-scheme: light; color: var(--x); }`,
    alwaysLight,
  ],
  [
    "a universal color-scheme",
    `* { color-scheme: dark; } .a { color: light-dark(#123456, #654321); }`,
    alwaysDark,
  ],
  [
    "color-scheme from var()",
    `:root { --scheme: dark; } .a { color-scheme: var(--scheme); color: light-dark(#123456, #654321); }`,
    alwaysDark,
  ],
  [
    "both schemes from var()",
    `:root { --scheme: light dark; } .a { color-scheme: var(--scheme); color: light-dark(#123456, #654321); }`,
    followsPreference,
  ],
  [
    "a var() fallback color-scheme",
    `.a { color-scheme: var(--scheme-missing, dark); color: light-dark(#123456, #654321); }`,
    alwaysDark,
  ],
  [
    "color-scheme: initial",
    `.p { color-scheme: dark; } .a { color-scheme: initial; color: light-dark(#123456, #654321); }`,
    alwaysLight,
  ],
] as const satisfies readonly (readonly [
  string,
  string,
  Readonly<Record<Arm, Arm>>,
])[];

// CSS Color Adjust 1 §2.3: light-dark() reads the used colour scheme, which color-scheme decides and the preference only picks within
describe.each(inlineVariableModes)(
  "the used colour scheme, with inline variables %s",
  (_mode, options) => {
    test.each(colorSchemeScenes)("%s", (_name, css, arms) => {
      expect(renderedStyles(withArm(css, "light"), options)).not.toStrictEqual(
        renderedStyles(withArm(css, "dark"), options),
      );

      for (const preference of ["light", "dark"] as const) {
        act(() => {
          colorScheme.set(preference);
        });

        expect(renderedStyles(css, options)).toStrictEqual(
          renderedStyles(withArm(css, arms[preference]), options),
        );
      }
    });
  },
);

test("a pseudo-element's light-dark() reaches its prop, never the element", () => {
  registerCSS(
    `${SUPPORTS_BOTH_SCHEMES} .a::placeholder { color: light-dark(#123456, #654321); }`,
  );
  render(<TextInput testID={testID} className="a" />);
  const component = screen.getByTestId(testID);

  expect(component.props.placeholderTextColor).toBe("#123456");

  act(() => {
    colorScheme.set("dark");
  });

  expect(component.props.placeholderTextColor).toBe("#654321");
  expect(component.props.style).toStrictEqual({});
});

test("a stylesheet whose light-dark() lacks an arm renders no colour", () => {
  StyleCollection.inject({
    s: [
      [
        "a",
        [
          {
            s: [1, 1],
            d: [[[{}, "lightDark", ["#123456"]], "color", 1]],
            dv: 1,
          },
        ],
      ],
    ],
  });
  render(<View testID={testID} className="a" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({});
});

// Chromium, Firefox and WebKit render the light arm when the platform reports no preference
test.each([
  [":root { color-scheme: light dark; }", "#123456"],
  [":root { color-scheme: dark; }", "#654321"],
])("with no preference, %s renders %s", (root, color) => {
  act(() => {
    colorScheme.set(null);
  });
  registerCSS(`${root} .a { color: light-dark(#123456, #654321); }`);
  render(<View testID={testID} className="a" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ color });
});
