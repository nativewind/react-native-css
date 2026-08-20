import { Button as RNButton, type ButtonProps } from "react-native";

import { render } from "@testing-library/react-native";
import { copyComponentProperties } from "react-native-css/components/copyComponentProperties";
import { registerCSS, testID } from "react-native-css/jest";
import { useCssElement } from "react-native-css/native";
import type {
  StyledConfiguration,
  StyledProps,
} from "react-native-css/runtime.types";

/**
 * `nativeStyleMapping` drains keys OUT of the resolved style object and writes them onto real props
 * — `delete source[key]`, then `props[path] = value`. It mutates.
 *
 * That was harmless while every read of the styles observable recomputed: each render got a fresh
 * object and the mutation died with it. Now the observable memoises, so the object it mutates is the
 * CACHED one, shared by every consumer of that entry and surviving every render.
 *
 * It is idempotent — the second pass finds the key already drained and continues — but nothing
 * enforced that, and "it happens to be a no-op" is not a property anyone can rely on while editing
 * the drain. This pins it: the same component re-rendered many times, and a second component
 * joining the same cache entry, must both see the mapped prop and never a re-drained style.
 */

const mapping: StyledConfiguration<typeof RNButton> = {
  className: {
    target: false,
    nativeStyleMapping: { color: "color" },
  },
};

const Button = copyComponentProperties(
  RNButton,
  (props: StyledProps<ButtonProps, typeof mapping>) =>
    useCssElement(RNButton, props, mapping),
);

test("re-rendering does not re-drain the cached style object", () => {
  registerCSS(`.drain-once { color: orange; }`);

  const tree = render(
    <Button
      testID={testID}
      className="drain-once"
      title="Go"
      onPress={() => undefined}
    />,
  );

  const readColor = (): unknown => tree.getByText("Go").props.style?.[1]?.color;

  const first = readColor();
  expect(first).toBe("#ffa500");

  for (let pass = 0; pass < 10; pass += 1) {
    tree.rerender(
      <Button
        testID={testID}
        className="drain-once"
        title="Go"
        onPress={() => undefined}
      />,
    );
    expect(readColor()).toBe(first);
  }

  tree.unmount();
});

test("a second component joining the same entry sees the same mapped value", () => {
  // The sharper half: the entry is shared, so a mutation left behind by the first consumer would
  // reach the second as a MISSING value rather than a wrong one.
  registerCSS(`.drain-shared { color: blue; }`);

  const first = render(
    <Button
      testID={testID}
      className="drain-shared"
      title="One"
      onPress={() => undefined}
    />,
  );
  const second = render(
    <Button
      testID={testID}
      className="drain-shared"
      title="Two"
      onPress={() => undefined}
    />,
  );

  expect(first.getByText("One").props.style?.[1]?.color).toBe("#00f");
  expect(second.getByText("Two").props.style?.[1]?.color).toBe("#00f");

  first.unmount();
  second.unmount();
});
