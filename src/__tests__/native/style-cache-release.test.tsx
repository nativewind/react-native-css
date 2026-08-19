/* eslint-disable @typescript-eslint/no-deprecated */
import { render } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { vars } from "react-native-css/runtime";

import { stylesFamily } from "../../native/styles";

/**
 * The resolved-style cache is keyed by a hash and holds an observable per entry. Its factory
 * already carries the release — `cleanup` deletes the family entry once nothing observes the
 * observable — so the cache was designed to be proportional to what is MOUNTED.
 *
 * Nothing reached that release. A component subscribes through two effects that share one
 * `observers` Set, `cleanupEffect` removes only the effect it was handed and then clears the shared
 * set, so the sibling stays registered on every observable it ever read. The observer count never
 * falls to zero, the entry is never deleted, and the dead component's `run` — which closes over its
 * `setState` — stays reachable from the observable graph.
 */

test("the cache releases an entry when the last component using it unmounts", () => {
  registerCSS(`.release-a { color: red; }`);
  stylesFamily.clear();

  const tree = render(<View className="release-a" />);
  expect(stylesFamily.size()).toBe(1);

  tree.unmount();

  expect(stylesFamily.size()).toBe(0);
});

test("an entry shared by two components survives until BOTH unmount", () => {
  // The release is refcounted, not "the first unmount wins" — a shared entry that vanished when one
  // of its users left would make the survivor recompute for no reason.
  registerCSS(`.release-b { color: blue; }`);
  stylesFamily.clear();

  const first = render(<View className="release-b" />);
  const second = render(<View className="release-b" />);
  expect(stylesFamily.size()).toBe(1);

  first.unmount();
  expect(stylesFamily.size()).toBe(1);

  second.unmount();
  expect(stylesFamily.size()).toBe(0);
});

test("a superseded entry is released while the component stays mounted", () => {
  // `vars()` returns a fresh object per call, so an inline `style={vars({...})}` gives the cache a
  // new weak key — and a new entry — on every render. Each render supersedes the last, so every
  // entry but the current one has no observer left and must go.
  registerCSS(`.release-c { color: var(--probe); }`);
  stylesFamily.clear();

  const tree = render(
    <View className="release-c" style={vars({ probe: "red" })} />,
  );

  for (let pass = 0; pass < 12; pass += 1) {
    tree.rerender(
      <View className="release-c" style={vars({ probe: "red" })} />,
    );
  }

  expect(stylesFamily.size()).toBe(1);

  tree.unmount();
  expect(stylesFamily.size()).toBe(0);
});
