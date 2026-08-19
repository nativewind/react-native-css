/* eslint-disable @typescript-eslint/no-deprecated */
import { render } from "@testing-library/react-native";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { vars } from "react-native-css/runtime";

import { stylesFamily } from "../../native/styles";

/**
 * The unit tests pin the release on one component and one supersede. These drive the shapes that
 * only appear at scale — churn, nesting, sharing across a tree — because a refcount is exactly the
 * kind of thing that holds for one subscriber and drifts for many.
 *
 * Every assertion here is a COUNT rather than a duration, so none of it measures the machine.
 */

test("mounting and unmounting a tree repeatedly returns the cache to empty", () => {
  registerCSS(`
    .stress-a { color: red; }
    .stress-b { color: blue; }
    .stress-c { font-size: 12px; }
  `);
  stylesFamily.clear();

  const peaks: number[] = [];

  for (let cycle = 0; cycle < 25; cycle += 1) {
    const tree = render(
      <View className="stress-a">
        <View className="stress-b">
          <Text className="stress-c">deep</Text>
        </View>
        <View className="stress-b" />
      </View>,
    );
    peaks.push(stylesFamily.size());
    tree.unmount();

    // The invariant that matters: every cycle ends where it started. A refcount that leaked even
    // one entry per cycle would ratchet, and 25 cycles is enough to see it.
    expect(stylesFamily.size()).toBe(0);
  }

  // And the peak is the same every time — a tree that grew its own working set would show here.
  expect(new Set(peaks).size).toBe(1);
});

test("an entry shared across many siblings survives until the last one goes", () => {
  registerCSS(`.stress-shared { color: green; }`);
  stylesFamily.clear();

  const trees = Array.from({ length: 30 }, () =>
    render(<View className="stress-shared" />),
  );

  // Thirty components, one distinct class list, one entry.
  expect(stylesFamily.size()).toBe(1);

  for (const [index, tree] of trees.entries()) {
    tree.unmount();
    // Present until the last unmount, gone exactly on it.
    expect(stylesFamily.size()).toBe(index === trees.length - 1 ? 0 : 1);
  }
});

test("per-render key churn stays flat and drains completely", () => {
  // The pathological shape: a mounted component minting a fresh weak key every render. Flat while
  // mounted is the release working on the supersede path; zero after is it working on unmount.
  registerCSS(`.stress-churn { color: var(--churn); }`);
  stylesFamily.clear();

  const tree = render(
    <View className="stress-churn" style={vars({ churn: "red" })} />,
  );

  const sizes: number[] = [];
  for (let pass = 0; pass < 50; pass += 1) {
    tree.rerender(
      <View className="stress-churn" style={vars({ churn: "red" })} />,
    );
    sizes.push(stylesFamily.size());
  }

  expect(new Set(sizes)).toStrictEqual(new Set([1]));

  tree.unmount();
  expect(stylesFamily.size()).toBe(0);
});
