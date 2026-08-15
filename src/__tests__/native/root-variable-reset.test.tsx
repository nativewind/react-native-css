import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { StyleCollection } from "react-native-css/native";

import {
  resetGlobalVariables,
  rootVariables,
  universalVariables,
} from "../../native-internal/root";

/**
 * `:root` and `*` variables live in two process-global families that no test
 * owns. Clearing `StyleCollection.styles` between tests does not touch them, so
 * a `vr` or `vu` entry injected by one test resolves in the next one.
 *
 * Every test here drives the reset itself rather than relying on a previous
 * test having dirtied the registries, so each passes alone and in any order.
 */

test("resetGlobalVariables drops injected root and universal variables", () => {
  rootVariables("injected-root").set([["#123456"]]);
  universalVariables("injected-universal").set([["#abcdef"]]);

  expect(rootVariables("injected-root").get()).toBe("#123456");
  expect(universalVariables("injected-universal").get()).toBe("#abcdef");

  resetGlobalVariables();

  expect(rootVariables("injected-root").get()).toBeUndefined();
  expect(universalVariables("injected-universal").get()).toBeUndefined();
});

test("resetGlobalVariables keeps the variables the runtime declares itself", () => {
  resetGlobalVariables();

  // `rem` backs every `em`/`rem` unit, so dropping it would silently resolve
  // every relative length to nothing.
  expect(rootVariables("__rn-css-rem").get()).toBe(14);
  expect(rootVariables("__rn-css-color").get()).toBeDefined();
});

test("a variable injected by one stylesheet does not survive a reset", () => {
  // The unmatched second declaration keeps `--leaky` out of the compiler's
  // static fold, so it really is injected into `rootVariables` and the reset
  // below is what has to remove it.
  registerCSS(`
    :root { --leaky: #123456; }
    @media (min-width: 99999px) { :root { --leaky: #abcdef; } }
    .my-class { color: var(--leaky); }
  `);

  render(<View testID={testID} className="my-class" />);
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#123456",
  });

  // Exactly what the jest harness does between tests.
  StyleCollection.styles.clear();
  resetGlobalVariables();

  registerCSS(`.my-class { color: var(--leaky); }`);

  render(<View testID={testID} className="my-class" />);
  expect(screen.getByTestId(testID).props.style).toStrictEqual({});
});
