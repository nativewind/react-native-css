import type { ComponentType } from "react";

import { render } from "@testing-library/react-native";
import { registerCSS, testID } from "react-native-css/jest";

import {
  collectProps,
  flattenStyles,
  rootStyle,
  serializeRender,
  withoutFabric,
} from "../_gesture-handler";

// Jest resolves the iOS GestureHandlerRootView, so the Android variant, a native view the rewrite cannot reach, is substituted
jest.mock(
  "react-native-gesture-handler/lib/commonjs/components/GestureHandlerRootView",
  (): Record<string, unknown> =>
    jest.requireActual<Record<string, unknown>>(
      "react-native-gesture-handler/lib/commonjs/components/GestureHandlerRootView.android",
    ),
);

withoutFabric();

function styledRootView(): ComponentType<Record<string, unknown>> {
  return jest.requireActual<Record<string, unknown>>(
    "react-native-css/components/react-native-gesture-handler",
  ).GestureHandlerRootView as ComponentType<Record<string, unknown>>;
}

function unwrappedRootView(): ComponentType<Record<string, unknown>> {
  return jest.requireActual<Record<string, unknown>>(
    "react-native-gesture-handler",
  ).GestureHandlerRootView as ComponentType<Record<string, unknown>>;
}

function renderWith(
  component: ComponentType<Record<string, unknown>>,
  props: Record<string, unknown> = {},
): unknown {
  const Component = component;

  return render(<Component testID={testID} {...props} />).toJSON();
}

test("the Android variant is what these cases render", () => {
  expect(serializeRender(renderWith(unwrappedRootView()))).toContain(
    "RNGestureHandlerRootView",
  );
});

test("the unwrapped Android variant leaks the class — the bug this closes", () => {
  registerCSS(`.w-97 { width: 97px; }`);

  const tree = renderWith(unwrappedRootView(), { className: "w-97" });

  expect(
    collectProps(tree).filter((props) => Object.hasOwn(props, "className")),
  ).not.toEqual([]);
  expect(flattenStyles(tree)).not.toContainEqual(
    expect.objectContaining({ width: 97 }),
  );
});

test("the wrapper resolves the class on Android, where the rewrite cannot", () => {
  registerCSS(`.w-98 { width: 98px; }`);

  const tree = renderWith(styledRootView(), { className: "w-98" });

  expect(flattenStyles(tree)).toContainEqual(
    expect.objectContaining({ width: 98 }),
  );

  for (const props of collectProps(tree)) {
    expect(props).not.toHaveProperty("className");
  }
});

test("the flex:1 default survives the class on Android too", () => {
  registerCSS(`.w-99 { width: 99px; }`);

  expect(
    flattenStyles(renderWith(styledRootView(), { className: "w-99" })),
  ).toContainEqual(expect.objectContaining({ flex: 1 }));
});

// Yoga reads a positive flex over an explicit or absent basis, so a default left beside these would collapse a root sized to its content
test.each([
  ["grow-0", "flex-grow: 0", { flexGrow: 0 }],
  ["shrink-0", "flex-shrink: 0", { flexShrink: 0 }],
  ["basis-90", "flex-basis: 90px", { flexBasis: 90 }],
  ["flex-none", "flex: none", { flexGrow: 0, flexShrink: 0 }],
])(
  "a class stating its own flex sizing (%s) replaces the flex:1 default",
  (className, declaration, sizing) => {
    registerCSS(`.${className} { ${declaration}; }`);

    const style = rootStyle(renderWith(styledRootView(), { className }));

    expect(style).toMatchObject(sizing);
    expect(style).not.toHaveProperty("flex");
  },
);

test("an inline style displaces the default, as Gesture Handler's own does", () => {
  registerCSS(`.w-96 { width: 96px; }`);

  for (const props of [
    { style: { width: 95 } },
    { className: "w-96", style: { height: 94 } },
  ]) {
    const style = rootStyle(renderWith(styledRootView(), props));

    expect(style).not.toHaveProperty("flex");
    expect(style).not.toHaveProperty("flexGrow");
    expect(style).not.toHaveProperty("flexBasis");
  }
});

test("renders identically to the unwrapped Android variant with no className", () => {
  expect(serializeRender(renderWith(styledRootView()))).toBe(
    serializeRender(renderWith(unwrappedRootView())),
  );
});
