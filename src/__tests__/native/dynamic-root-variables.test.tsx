import { render, screen } from "@testing-library/react-native";
import { compile } from "react-native-css/compiler";
import { View } from "react-native-css/components/View";
import {
  dynamicRootVariables,
  registerCSS,
  testID,
} from "react-native-css/jest";

// `inlineVariables` (`src/compiler/inline-variables.ts`) inlines a custom
// property that has exactly one declaration. A `:root` test written that way
// asserts the inliner and passes with the runtime variable registry deleted, so
// it proves nothing about the runtime. `dynamicRootVariables` emits a second
// declaration to keep the property dynamic.
//
// The first tests pin the inliner's behaviour itself: if it stops inlining, or
// starts keying on use count instead of declaration count, they fail and the
// helper can be retired.

test("a single :root declaration is inlined before the runtime sees it", () => {
  const stylesheet = compile(`
    :root { --my-var: #123456; }
    .my-class { color: var(--my-var); }
  `).stylesheet();

  // No root-variable entry at all: the runtime registry is never reached.
  expect(stylesheet.vr).toBeUndefined();
  expect(stylesheet.s).toStrictEqual([
    [
      "my-class",
      [
        {
          s: [1, 1],
          d: [{ color: "#123456" }],
          v: [["__rn-css-color", "#123456"]],
        },
      ],
    ],
  ]);
});

test("reading a single declaration many times does not save it", () => {
  // The inliner keys on declaration count, not use count, so spreading the
  // `var()` across rules is not a way out of the trap.
  const stylesheet = compile(`
    :root { --my-var: #123456; }
    .a { color: var(--my-var); }
    .b { color: var(--my-var); }
  `).stylesheet();

  expect(stylesheet.vr).toBeUndefined();
});

test("turning the inliner off is the other way to keep it dynamic", () => {
  // Supported, but it applies to the whole stylesheet and is not the
  // configuration users compile under, so tests prefer a second declaration.
  const stylesheet = compile(
    `
    :root { --my-var: #123456; }
    .my-class { color: var(--my-var); }
  `,
    { inlineVariables: false },
  ).stylesheet();

  expect(stylesheet.vr).toStrictEqual([["my-var", [["#123456"]]]]);
});

test("dynamicRootVariables keeps the property dynamic", () => {
  const stylesheet = compile(`
    ${dynamicRootVariables({ "--my-var": "#123456" })}
    .my-class { color: var(--my-var); }
  `).stylesheet();

  // The declaration reaches the runtime registry, and the style is a `var`
  // descriptor the runtime has to resolve rather than a folded literal.
  expect(stylesheet.vr).toStrictEqual([
    ["my-var", [["#123456", [[">=", "width", 999999]]], ["#123456"]]],
  ]);
  expect(stylesheet.s?.[0]?.[1]).toStrictEqual([
    {
      s: [4, 1],
      d: [[[{}, "var", "my-var", 1], "color", 1]],
      dv: 1,
      v: [["__rn-css-color", [{}, "var", "my-var", 1]]],
    },
  ]);
});

test("dynamicRootVariables resolves to the declared value at runtime", () => {
  registerCSS(`
    ${dynamicRootVariables({ "--my-var": "10px" })}
    .my-class { width: var(--my-var); }
  `);

  render(<View testID={testID} className="my-class" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("dynamicRootVariables accepts a name written without the -- prefix", () => {
  registerCSS(`
    ${dynamicRootVariables({ "my-var": "10px" })}
    .my-class { width: var(--my-var); }
  `);

  render(<View testID={testID} className="my-class" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("dynamicRootVariables declares every property it is given", () => {
  registerCSS(`
    ${dynamicRootVariables({ "--width": "10px", "--height": "20px" })}
    .my-class { width: var(--width); height: var(--height); }
  `);

  render(<View testID={testID} className="my-class" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    width: 10,
    height: 20,
  });
});
