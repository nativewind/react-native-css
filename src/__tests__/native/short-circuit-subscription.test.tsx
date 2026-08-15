import { act, render, screen } from "@testing-library/react-native";
import { compile } from "react-native-css/compiler";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

import { testMediaQuery } from "../../native/conditions/media-query";
import {
  colorScheme as colorSchemeObservable,
  dimensions,
  vw,
  type Getter,
} from "../../native/reactivity";

/**
 * A composite condition whose FIRST operand fails cannot read its second: the
 * conjunction is already decided. The operand that decided it is subscribed,
 * so the change that could revive the second one is the change that re-runs
 * the whole condition — and that pass reads and subscribes to it.
 *
 * These tests measure that claim rather than asserting it.
 */

const NARROW = 320;

test("a short-circuited operand does not subscribe, and does not need to", () => {
  registerCSS(`
.my-class { color: blue; }

@media (min-width: 9999px) and (prefers-color-scheme: dark) {
  .my-class { color: red; }
}`);

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  act(() => {
    dimensions.set({ ...dimensions.get(), width: NARROW });
  });

  expect(component.props.style).toStrictEqual({ color: "#00f" });

  // Step 1: the width fails, so the colour scheme was never read. Changing it
  // must not change the answer — the width still fails.
  act(() => {
    colorScheme.set("dark");
  });
  expect(component.props.style).toStrictEqual({ color: "#00f" });

  // Step 2: widen. The width DID subscribe (reading it is what produced the
  // false), so this re-runs the condition, and that pass reads the colour
  // scheme, which is already dark.
  act(() => {
    dimensions.set({ ...dimensions.get(), width: 10000 });
  });
  expect(component.props.style).toStrictEqual({ color: "#f00" });

  // Step 3: the colour scheme is now genuinely subscribed, so it is live.
  act(() => {
    colorScheme.set("light");
  });
  expect(component.props.style).toStrictEqual({ color: "#00f" });

  // Step 4: and it stays live in both directions.
  act(() => {
    colorScheme.set("dark");
  });
  expect(component.props.style).toStrictEqual({ color: "#f00" });
});

test("the disjunction mirror: a satisfied first operand skips the second", () => {
  registerCSS(`
.my-class { color: blue; }

@media (min-width: 100px) or (prefers-color-scheme: dark) {
  .my-class { color: red; }
}`);

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  act(() => {
    dimensions.set({ ...dimensions.get(), width: NARROW });
  });

  // The first operand is true, so the disjunction is decided and the colour
  // scheme is never read.
  expect(component.props.style).toStrictEqual({ color: "#f00" });

  act(() => {
    colorScheme.set("dark");
  });
  expect(component.props.style).toStrictEqual({ color: "#f00" });

  // Narrow below the threshold. The width was subscribed, so this re-runs the
  // condition; that pass reads the colour scheme, which holds the rule on.
  act(() => {
    dimensions.set({ ...dimensions.get(), width: 50 });
  });
  expect(component.props.style).toStrictEqual({ color: "#f00" });

  act(() => {
    colorScheme.set("light");
  });
  expect(component.props.style).toStrictEqual({ color: "#00f" });
});

/**
 * The render tests above pass whether evaluation is lazy or eager, which is
 * the point — soundness is what they measure. This one measures that the
 * short-circuit is REAL, so those tests are not vacuously green against an
 * eager evaluator.
 */
test("MEASUREMENT: a decided conjunction reads only the operand that decided it", () => {
  // The real compiled condition, not a hand-written literal: this is exactly
  // what the runtime receives for
  // `(min-width: 9999px) and (prefers-color-scheme: dark)`.
  const conditions = compile(
    `@media (min-width: 9999px) and (prefers-color-scheme: dark) {
       .my-class { color: red; }
     }`,
  ).stylesheet().s?.[0]?.[1];

  const condition = Array.isArray(conditions) ? conditions[0]?.m : undefined;

  if (!condition) {
    throw new Error("expected a compiled media condition");
  }

  expect(condition).toStrictEqual([
    [
      "&",
      [
        [">=", "width", 9999],
        ["=", "prefers-color-scheme", "dark"],
      ],
    ],
  ]);

  act(() => {
    dimensions.set({ ...dimensions.get(), width: NARROW });
  });

  const read: string[] = [];
  const names = new Map<unknown, string>([
    [vw, "vw"],
    [colorSchemeObservable, "colorScheme"],
  ]);

  const spy: Getter = (observable) => {
    read.push(names.get(observable) ?? "other");
    return observable.get();
  };

  expect(testMediaQuery(condition, spy)).toBe(false);

  // The measurement. Under eager evaluation this reads
  // `["vw", "colorScheme"]`.
  expect(read).toStrictEqual(["vw"]);
});
