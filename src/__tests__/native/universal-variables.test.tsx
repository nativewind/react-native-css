import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

import { dimensions } from "../../native/reactivity";

/**
 * `:root` and `*` are two different variable censuses. The compiler already
 * keeps them apart - `:root` compiles to `vr`, `*` compiles to `vu` - and the
 * resolver already consults universal before root.
 *
 * `*` outranking `:root` is correct CSS for any non-root element: a `*`
 * declaration applies to the element directly, while a `:root` declaration
 * only reaches it by inheritance, and a direct declaration wins. These tests
 * make that ranking an asserted contract rather than a side effect of one
 * census being empty.
 */

// Every viewport in these tests is far below this, so the query never matches.
const neverMatches = "(min-width: 99999px)";

beforeEach(() => {
  // The media query verdicts below are read off `vw`, so the viewport is stated
  // rather than inherited from whatever the previous test left behind.
  dimensions.set({ width: 750, height: 1334, scale: 2, fontScale: 2 });
});

test("a universal variable outranks a root variable of the same name", () => {
  registerCSS(`
    :root { --my-var: #123456; }
    * { --my-var: #abcdef; }
    .my-class { color: var(--my-var); }
  `);

  render(<View testID={testID} className="my-class" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#abcdef",
  });
});

test("a root variable resolves when no universal variable is declared", () => {
  // The second `:root` declaration is what keeps this dynamic. A `:root`
  // variable with exactly one declaration is folded into the rule by the
  // compiler, so the runtime registry is never consulted and the test would
  // pass no matter what the registry held.
  registerCSS(`
    :root { --my-var: #123456; }
    @media ${neverMatches} { :root { --my-var: #abcdef; } }
    .my-class { color: var(--my-var); }
  `);

  render(<View testID={testID} className="my-class" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#123456",
  });
});

test("a universal variable behind an unmatched media query falls back to root", () => {
  registerCSS(`
    :root { --my-var: #123456; }
    @media ${neverMatches} { * { --my-var: #abcdef; } }
    .my-class { color: var(--my-var); }
  `);

  render(<View testID={testID} className="my-class" />);

  // The universal declaration does not apply at this viewport, so the root
  // declaration is what is left. Collapsing both censuses into one family
  // loses this, because the universal entry overwrites the root entry and then
  // resolves to nothing.
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#123456",
  });
});

test("a root variable behind an unmatched media query falls back to universal", () => {
  registerCSS(`
    @media ${neverMatches} { :root { --my-var: #123456; } }
    * { --my-var: #abcdef; }
    .my-class { color: var(--my-var); }
  `);

  render(<View testID={testID} className="my-class" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#abcdef",
  });
});
