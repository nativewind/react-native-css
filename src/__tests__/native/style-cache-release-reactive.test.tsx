import { act, render } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

import {
  colorScheme as colorSchemeObservable,
  dimensions,
} from "../../native/reactivity";
import { stylesFamily } from "../../native/styles";

/**
 * The release has to hold for a style that READS another observable, which is most real styles: a
 * viewport unit, an undefined variable, anything under `@media (prefers-color-scheme: dark)`.
 *
 * These are the cases a `color: red` test cannot reach. An entry that reads a source observable
 * subscribes to it, and if the subscriber list and the dependency list are the same container then
 * the source lands in the entry's OWN observer set — so "nothing observes this any more" is
 * unreachable and the entry is never released, however correct the unmount path looks.
 */

test("an entry reading a viewport unit is released on unmount", () => {
  registerCSS(`.reactive-vw { width: 10vw; }`);
  stylesFamily.clear();

  const tree = render(<View className="reactive-vw" />);
  expect(stylesFamily.size()).toBe(1);

  tree.unmount();
  expect(stylesFamily.size()).toBe(0);
});

test("an entry reading an undefined variable is released on unmount", () => {
  registerCSS(`.reactive-missing { color: var(--not-defined); }`);
  stylesFamily.clear();

  const tree = render(<View className="reactive-missing" />);
  tree.unmount();

  expect(stylesFamily.size()).toBe(0);
});

test("an entry reading a dark-mode root variable is released on unmount", () => {
  // The commonest real shape there is — every Tailwind theme is a `:root` block under a
  // prefers-color-scheme media query.
  registerCSS(`
    :root { --brand: red; }
    @media (prefers-color-scheme: dark) { :root { --brand: blue; } }
    .reactive-brand { color: var(--brand); }
  `);
  stylesFamily.clear();

  const tree = render(<View className="reactive-brand" />);
  tree.unmount();

  expect(stylesFamily.size()).toBe(0);
});

test("a viewport-unit entry stays reactive while mounted", () => {
  // The release must not be bought by unsubscribing something still in use.
  registerCSS(`.reactive-live { width: 50vw; }`);
  stylesFamily.clear();

  const tree = render(<View testID="live" className="reactive-live" />);
  const component = tree.getByTestId("live");

  act(() => {
    dimensions.set({ ...dimensions.get(), width: 400 });
  });

  expect(component.props.style).toStrictEqual({ width: 200 });
  tree.unmount();
});

test("a root-variable change does not notify unrelated colorScheme subscribers", () => {
  // A derived observable that READS `colorScheme` must not end up in its own subscriber list, or a
  // single variable change re-runs every `dark:` component in the app.
  registerCSS(`
    :root { --amp: red; }
    @media (prefers-color-scheme: dark) { :root { --amp: blue; } }
    .amp-user { color: var(--amp); }
  `);
  stylesFamily.clear();

  const tree = render(<View className="amp-user" />);

  let unrelatedRuns = 0;
  colorSchemeObservable.get({
    observers: new Set(),
    run: () => (unrelatedRuns += 1),
  });

  colorScheme.set("dark");
  const afterSchemeChange = unrelatedRuns;
  expect(afterSchemeChange).toBeGreaterThan(0);

  tree.unmount();
});
