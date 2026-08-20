import { act, render } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

import { dimensions } from "../../native/reactivity";
import { stylesFamily } from "../../native/styles";

/**
 * Two ways a release can be worse than no release at all.
 *
 * A resolved-style entry both READS other observables and IS read, so recording a dependency in the
 * same container as a subscriber turns the graph into a cycle that `notify()` walks — and the
 * styles observable never compares equal (it returns a fresh object), so nothing terminates it.
 *
 * And the release closes over the hash it was created under. If that hash has since been remapped
 * to a different observable — by eviction, or by another component rebuilding it — deleting by hash
 * alone destroys a live entry belonging to someone else.
 */

test("an animated viewport-unit class survives a dimension change", () => {
  // Ordinary Tailwind: `w-[50vw] animate-spin`. The keyframes observable notifies unconditionally
  // and the styles observable never compares equal, so a cycle between them does not terminate.
  registerCSS(`
    @keyframes spin { from { opacity: 0; } to { opacity: 1; } }
    .cycle-boom { width: 50vw; animation: spin 1s; }
  `);
  stylesFamily.clear();

  const tree = render(<View testID="boom" className="cycle-boom" />);

  expect(() => {
    act(() => {
      dimensions.set({ ...dimensions.get(), width: 400 });
    });
  }).not.toThrow();

  tree.unmount();
});

test("unmounting a component does not delete another component's live entry", () => {
  // Two components on one class share an entry. If the first to leave deletes by hash without
  // checking the map still holds ITS observable, the survivor is orphaned — it keeps an observable
  // no longer in the map, and the next component with that class gets a different one.
  registerCSS(`.shared-identity { color: red; }`);
  stylesFamily.clear();

  const first = render(<View className="shared-identity" />);
  const second = render(<View className="shared-identity" />);
  expect(stylesFamily.size()).toBe(1);

  first.unmount();

  // Still one entry, and a third component must join THAT entry rather than build a new one.
  expect(stylesFamily.size()).toBe(1);
  const third = render(<View className="shared-identity" />);
  expect(stylesFamily.size()).toBe(1);

  second.unmount();
  third.unmount();
  expect(stylesFamily.size()).toBe(0);
});

test("a superseded component does not delete the entry it left behind", () => {
  // The stale-reference shape. A supersedes its own entry by re-rendering to a different class, so
  // its effects still list the OLD observable as a dependency. B then joins that old entry. When A
  // unmounts, its cleanup walks that stale dependency and releases by hash — and the hash now maps
  // to an entry B is using.
  registerCSS(`.stale-a { color: red; } .stale-b { color: blue; }`);
  stylesFamily.clear();

  const first = render(<View className="stale-a" />);
  first.rerender(<View className="stale-b" />);

  const second = render(<View className="stale-a" />);
  const sizeWithBoth = stylesFamily.size();

  first.unmount();

  // B's entry must survive A's unmount. A no longer uses `.stale-a` at all.
  expect(stylesFamily.size()).toBe(sizeWithBoth - 1);

  second.unmount();
  expect(stylesFamily.size()).toBe(0);
});
