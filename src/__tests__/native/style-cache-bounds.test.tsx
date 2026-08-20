import { View as RNView, type ViewProps } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { copyComponentProperties } from "react-native-css/components/copyComponentProperties";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { useCssElement } from "react-native-css/native";
import type {
  StyledConfiguration,
  StyledProps,
} from "react-native-css/runtime.types";

import { mappingToConfig } from "../../native/react/useNativeCss";
import { stylesFamily } from "../../native/styles";

/**
 * Sharing a cache entry across elements is only safe if the entry is (a) released when the last
 * element using it unmounts, and (b) not consumed by whichever element reads it first.
 *
 * Both became load-bearing when the config stopped being per-instance: before that, every element
 * held its own entry, so an entry that leaked was one element's worth and an entry that was drained
 * was drained only for its owner.
 */

/** A module constant, exactly as every shipped wrapper declares it. */
const tintedMapping = {
  className: { target: "style", nativeStyleMapping: { color: "tintColor" } },
} as unknown as StyledConfiguration<typeof RNView>;

const Tinted = copyComponentProperties(
  RNView,
  (props: StyledProps<ViewProps, typeof tintedMapping>) =>
    useCssElement(RNView, props, tintedMapping),
);

test("nothing writes to the config every element now shares", () => {
  // While each element minted its own config, a write to one was private. Sharing makes
  // "the consumers only read it" load-bearing rather than incidental — and that claim was
  // inherited rather than measured.
  //
  // Checked by VALUE rather than by `Object.freeze`: a write to a frozen object throws only in
  // strict mode, and measured here it does not throw at all — so a freeze-based version of this
  // test passes whatever the code does, which is worse than not having it.
  registerCSS(`.tinted { color: orange; }`);

  const shared = mappingToConfig(tintedMapping);
  const before = JSON.stringify(shared);

  render(<Tinted className="tinted" testID="unmutated" />);

  expect(JSON.stringify(shared)).toBe(before);
  expect(screen.getByTestId("unmutated").props.tintColor).toBe("#ffa500");
});

test("a shared entry is not consumed by the first element that reads it", () => {
  // `nativeStyleMapping` drains the resolved style in place. That is harmless when every element
  // owns its entry and load-bearing once they share one.
  registerCSS(`.tinted { color: orange; }`);
  stylesFamily.clear();

  render(
    <>
      <Tinted className="tinted" testID="a" />
      <Tinted className="tinted" testID="b" />
      <Tinted className="tinted" testID="c" />
    </>,
  );

  const first = screen.getByTestId("a").props.tintColor;

  expect(first).toBe("#ffa500");
  expect(screen.getByTestId("b").props.tintColor).toBe(first);
  expect(screen.getByTestId("c").props.tintColor).toBe(first);
});

test("the cache does not grow when a screen is entered and left repeatedly", () => {
  // The OOM shape, and the one this PR changes. Entries are not released on unmount — that is a
  // separate, pre-existing defect — so what matters is whether a second visit ADDS to them.
  //
  // With the config minted per instance, a remount produces new config identities, therefore new
  // state hashes, therefore new entries, while the old ones stay. Measured on `main`: 2 entries
  // after the first visit, 4 after the second, and so on without limit. Deriving the config once
  // per mapping makes the second visit reuse the first visit's key, so the count is a function of
  // what the app renders rather than of how often it has been rendered.
  registerCSS(`.churn-a { color: red; } .churn-b { color: blue; }`);
  stylesFamily.clear();

  const sizes: number[] = [];

  for (let cycle = 0; cycle < 25; cycle += 1) {
    const tree = render(
      <>
        <View className="churn-a" />
        <View className="churn-b" />
      </>,
    );
    sizes.push(stylesFamily.size());
    tree.unmount();
  }

  // Every cycle reaches the same count. A ratcheting cache fails on the second entry, not the last.
  expect(new Set(sizes).size).toBe(1);
  expect(sizes[0]).toBe(2);
});
