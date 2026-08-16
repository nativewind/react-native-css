import type { ComponentType } from "react";

import { render } from "@testing-library/react-native";
import { registerCSS, testID } from "react-native-css/jest";

import {
  collectProps,
  disableFabric,
  flattenStyles,
} from "../_gesture-handler";

/**
 * `GestureHandlerRootView` has two implementations, and only one of them is reachable
 * from the sibling suites. The default renders a react-native `View`, so the rewrite
 * substitutes a styled twin underneath it and the class resolves whether or not this
 * package re-declares anything. The Android one renders
 * `specs/RNGestureHandlerRootViewNativeComponent` — a codegen'd native view, with no
 * `react-native` specifier anywhere in the file — so the rewrite has nothing to match
 * and the raw class string lands on the element. That is the `PureNativeButton` shape,
 * on the export every app mounts at its root, on the platform where mounting it is
 * mandatory.
 *
 * Jest's `defaultPlatform` is `ios`, so the sibling suites resolve the default variant
 * and cannot see this. Substituting the Android module for the one the index requires
 * is what puts the shipped wrapper over the shipped Android component.
 */
jest.mock(
  "react-native-gesture-handler/lib/commonjs/components/GestureHandlerRootView",
  (): Record<string, unknown> =>
    jest.requireActual<Record<string, unknown>>(
      "react-native-gesture-handler/lib/commonjs/components/GestureHandlerRootView.android",
    ),
);

beforeAll(disableFabric);

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
  // Without the substitution every assertion below measures the default variant, which
  // the sibling suites already cover — and the two disagree precisely here.
  expect(JSON.stringify(renderWith(unwrappedRootView()))).toContain(
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

test("renders identically to the unwrapped Android variant with no className", () => {
  // The resolver routes every gesture-handler import in the graph through this module,
  // so the no-className path has to stay byte-identical on both variants.
  expect(JSON.stringify(renderWith(styledRootView()))).toBe(
    JSON.stringify(renderWith(unwrappedRootView())),
  );
});
