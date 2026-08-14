import type { ComponentType } from "react";

import { render } from "@testing-library/react-native";
import * as StyledRNGH from "react-native-css/components/react-native-gesture-handler";
import { registerCSS, testID } from "react-native-css/jest";
import * as RNGH from "react-native-gesture-handler";

// Each test registers a declaration no other test uses, so "the style reached the
// tree" is an exact claim rather than a coincidence

interface RenderedNode {
  props: Record<string, unknown>;
  children: RenderedNode[] | null;
}

function collectProps(node: unknown): Record<string, unknown>[] {
  if (node === null || typeof node !== "object") {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap((child) => collectProps(child));
  }

  const { props, children } = node as RenderedNode;

  return [props, ...collectProps(children)];
}

function flattenStyles(node: unknown): Record<string, unknown>[] {
  return collectProps(node).flatMap((props) => {
    const style: unknown = props.style;

    if (Array.isArray(style)) {
      return style.filter(
        (entry): entry is Record<string, unknown> =>
          entry !== null && typeof entry === "object",
      );
    }

    return style !== null && typeof style === "object"
      ? [style as Record<string, unknown>]
      : [];
  });
}

/** Every component this wrapper re-declares, with the width it is styled by. */
const styledComponents = [
  ["Pressable", 11],
  ["RawButton", 12],
  ["BaseButton", 13],
  ["RectButton", 14],
  ["BorderlessButton", 15],
] as const satisfies readonly (readonly [keyof typeof StyledRNGH, number])[];

describe.each(styledComponents)("%s", (name, width) => {
  const className = `w-${width}`;

  test("resolves className into the rendered style", () => {
    registerCSS(`.${className} { width: ${width}px; }`);

    const Component = StyledRNGH[name] as ComponentType<
      Record<string, unknown>
    >;

    const tree = render(
      <Component testID={testID} className={className} />,
    ).toJSON();

    // The touchables merge their own keys into the same object, so the
    // claim is that this declaration reached the style — not that it is alone.
    expect(flattenStyles(tree)).toContainEqual(
      expect.objectContaining({ width }),
    );
  });

  test("never forwards className to a rendered element", () => {
    registerCSS(`.${className} { width: ${width}px; }`);

    const Component = StyledRNGH[name] as ComponentType<
      Record<string, unknown>
    >;

    const tree = render(
      <Component testID={testID} className={className} />,
    ).toJSON();

    for (const props of collectProps(tree)) {
      expect(props).not.toHaveProperty("className");
    }
  });

  test("the unwrapped component drops className — the bug this closes", () => {
    registerCSS(`.${className} { width: ${width}px; }`);

    const Component = RNGH[name] as ComponentType<Record<string, unknown>>;

    const tree = render(
      <Component testID={testID} className={className} />,
    ).toJSON();

    expect(flattenStyles(tree)).not.toContainEqual(
      expect.objectContaining({ width }),
    );
  });
});

test("re-exports the members it does not re-declare", () => {
  // `createNativeWrapper` forwards unclaimed props to a React Native primitive
  // and `Text` renders one directly, so the `react-native` rewrite already
  // reaches these. Re-wrapping them would style the handler, not the view.
  for (const name of [
    "FlatList",
    "ScrollView",
    "Switch",
    "Text",
    "TextInput",
  ] as const) {
    expect(StyledRNGH[name]).toBe(RNGH[name]);
  }

  // `className` is dropped on the touchables too, but gesture-handler
  // deprecates all four in favour of `Pressable`, so they are left untouched.
  // `DrawerLayout` and `Swipeable` take no plain `style` prop, so their mapping
  // would be a design decision rather than a mechanical one.

  // The gesture API itself must survive the re-export untouched.
  expect(StyledRNGH.Gesture).toBe(RNGH.Gesture);
  expect(StyledRNGH.GestureDetector).toBe(RNGH.GestureDetector);
  expect(StyledRNGH.GestureHandlerRootView).toBe(RNGH.GestureHandlerRootView);
});

test("Pressable styles the native button it renders", () => {
  registerCSS(`.pressable-target { width: 21px; }`);

  const rendered = render(
    <StyledRNGH.Pressable testID={testID} className="pressable-target" />,
  ).getByTestId(testID);

  // The measured defect: these classes reached no pixel because `className`
  // fell into RNGH's `...remainingProps` spread and onto a codegen'd native
  // component that declares no such prop.
  expect(flattenStyles(rendered)).toContainEqual(
    expect.objectContaining({ width: 21 }),
  );
});
