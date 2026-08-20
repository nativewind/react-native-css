import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

// The root `__rn-css-color` seed is a module-load side effect gated on
// Platform.OS, and jest-expo defaults to ios. Mock android so the runtime
// (react-native-css/jest -> native-internal/root) takes the Android branch;
// babel-jest hoists this jest.mock above the imports above.
jest.mock("react-native", () => {
  const ReactNative =
    jest.requireActual<typeof import("react-native")>("react-native");
  ReactNative.Platform.OS = "android";
  return ReactNative;
});

describe("android root __rn-css-color seed", () => {
  test("currentcolor with no ancestor resolves to a concrete color", () => {
    // The bug: the Android seed was PlatformColor('?attr/textColorPrimary'),
    // which resolves to a ColorStateList reference that never paints — so
    // currentcolor / default rings / text-current rendered nothing. It is now a
    // concrete color that always paints.
    colorScheme.set("light");
    registerCSS(`.c { color: currentcolor; }`);
    render(<View testID={testID} className="c" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      color: "#000000",
    });
  });

  test("the seed is scheme-aware — white in dark mode — via prefers-color-scheme", () => {
    // Reactivity comes from the root observable's existing media-query
    // evaluation reading the `colorScheme` observable — no extra Appearance
    // listener is added.
    colorScheme.set("dark");
    registerCSS(`.c { color: currentcolor; }`);
    render(<View testID={testID} className="c" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      color: "#FFFFFF",
    });
  });

  test("an ancestor-published color still overrides the root seed", () => {
    // The seed is only the *ultimate* fallback; a nearer published color wins,
    // so the fix changes nothing for content that already has a color context.
    colorScheme.set("light");
    registerCSS(`
      .parent { color: red; }
      .child { color: currentcolor; }
    `);
    render(
      <View testID="parent" className="parent">
        <View testID={testID} className="child" />
      </View>,
    );

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("responds live to a colorScheme change — reactive, not seeded once", () => {
    // Proves the reactivity claim: the same element re-resolves on a scheme
    // flip, through the root observable's media-query evaluation alone.
    colorScheme.set("light");
    registerCSS(`.c { color: currentcolor; }`);
    render(<View testID={testID} className="c" />);
    const element = screen.getByTestId(testID);

    expect(element.props.style).toStrictEqual({ color: "#000000" });

    act(() => {
      colorScheme.set("dark");
    });

    expect(element.props.style).toStrictEqual({ color: "#FFFFFF" });
  });

  test("a default ring (box-shadow currentcolor) paints with the seed color", () => {
    // The reported symptom: Tailwind's default ring color is currentcolor, so
    // with the old ColorStateList seed every ring was invisible on Android.
    colorScheme.set("light");
    registerCSS(
      `.ring { --my-ring: 0 0 0 2px currentcolor; box-shadow: var(--my-ring); }`,
    );
    render(<View testID={testID} className="ring" />);

    const boxShadow = screen.getByTestId(testID).props.style.boxShadow as [
      { color: string },
    ];
    expect(boxShadow[0].color).toBe("#000000");
  });

  test("a default inset-ring paints with the seed color", () => {
    colorScheme.set("light");
    registerCSS(
      `.ir { --my-ring: inset 0 0 0 2px currentcolor; box-shadow: var(--my-ring); }`,
    );
    render(<View testID={testID} className="ir" />);

    const boxShadow = screen.getByTestId(testID).props.style.boxShadow as [
      { inset: boolean; color: string },
    ];
    expect(boxShadow[0].inset).toBe(true);
    expect(boxShadow[0].color).toBe("#000000");
  });

  test("no color-scheme preference (null) falls back to the light default", () => {
    // Appearance.getColorScheme() can be null; the dark media query then fails,
    // so the seed resolves to its unconditioned light value rather than nothing.
    colorScheme.set(null);
    registerCSS(`.c { color: currentcolor; }`);
    render(<View testID={testID} className="c" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      color: "#000000",
    });
  });
});
