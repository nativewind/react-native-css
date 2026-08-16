import type { ComponentProps } from "react";
import { StyleSheet } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";
import {
  BaseButton as RNGHBaseButton,
  BorderlessButton as RNGHBorderlessButton,
  DrawerLayoutAndroid as RNGHDrawerLayoutAndroid,
  GestureHandlerRootView as RNGHGestureHandlerRootView,
  Pressable as RNGHPressable,
  PureNativeButton as RNGHPureNativeButton,
  RawButton as RNGHRawButton,
  RectButton as RNGHRectButton,
  type BaseButtonProps,
  type BorderlessButtonProps,
  type PressableProps,
  type RawButtonProps,
  type RectButtonProps,
} from "react-native-gesture-handler";

import { copyComponentProperties } from "./copyComponentProperties";

export * from "react-native-gesture-handler";

/**
 * Pressable and the button family render GestureHandlerButton, a codegen'd native
 * component, so the react-native rewrite never reaches them and className falls onto a
 * view that declares no such prop. Each forwards `style`, which these mappings target.
 * PureNativeButton is that same codegen'd component, exported directly.
 *
 * DrawerLayoutAndroid is gesture-handler's own `createNativeWrapper` over react-native's,
 * and the rewrite hands it react-native's raw component — `components/index.cts` has no
 * styled twin to inherit from — so it needs the mapping too. It forwards `style`.
 *
 * GestureHandlerRootView has two implementations and the rewrite reaches only one. The
 * default renders a react-native `View`, so a styled twin lands underneath it; the Android
 * one renders `specs/RNGestureHandlerRootViewNativeComponent`, with no `react-native`
 * specifier in the file for the rewrite to match, and the class string reaches a codegen'd
 * native view — the PureNativeButton shape, on the export every app mounts at its root and
 * on the platform where mounting it is mandatory. Both forward `style`, so one mapping
 * covers both; `rootViewDefault` below is the part that is not just a mapping.
 *
 * Not re-declared, and why:
 *
 * - ScrollView, Switch, TextInput, FlatList, Text — `createNativeWrapper` forwards
 *   unclaimed props to a react-native primitive and Text renders one directly, so the
 *   rewrite already reaches these. Wrapping them would style the handler, not the view.
 *   `react-native-gesture-handler-rewrite.test.tsx` renders them under that rewrite.
 * - The four touchables, DrawerLayout, Swipeable — className is dropped on all six.
 *   Gesture Handler marks every one `@deprecated`, in favour of Pressable and of the
 *   Reanimated twins. TouchableNativeFeedback is gesture-handler's own only on Android;
 *   elsewhere it re-exports react-native's, and that has no styled twin either.
 * - RefreshControl — className is dropped, for the same missing-twin reason as
 *   DrawerLayoutAndroid. Left as-is because react-native's jest mock renders
 *   `<RCTRefreshControl />` with no props at all, so a mapping here could not be tested,
 *   and `style` on a RefreshControl drives nothing on either platform.
 *
 * ReanimatedDrawerLayout and ReanimatedSwipeable are out of scope rather than out of reach.
 * Gesture Handler ships them as their own entry points and names neither from its index, so
 * `nativeResolver`'s exact `moduleName === "react-native-gesture-handler"` does not match
 * them — but that exactness is a scoping choice made in a function that already carries a
 * non-exact branch for react-native's own Libraries, and it is a `startsWith` from covering
 * them. What holds them back is an API question, not a resolver one: neither exposes a plain
 * `style`, only `contentContainerStyle` / `drawerContainerStyle` and `containerStyle` /
 * `childrenContainerStyle`, so covering them means minting `*ClassName` props on the
 * `contentContainerClassName` pattern for four targets nothing else in this package names.
 *
 * Those are the same four props DrawerLayout and Swipeable expose, which is what makes the
 * exclusion worth revisiting rather than closed: the deprecated bucket is excluded on the
 * grounds that Gesture Handler sends users to Pressable and to the Reanimated twins, and the
 * Reanimated twins are the uncovered set. The deprecated pair and their replacements need one
 * decision between them, and neither has it yet.
 */
const pressableMapping: StyledConfiguration<typeof RNGHPressable> = {
  className: "style",
};

export const Pressable = copyComponentProperties(
  RNGHPressable,
  (props: StyledProps<PressableProps, typeof pressableMapping>) => {
    return useCssElement(RNGHPressable, props, pressableMapping);
  },
);

const rawButtonMapping: StyledConfiguration<typeof RNGHRawButton> = {
  className: "style",
};

export const RawButton = copyComponentProperties(
  RNGHRawButton,
  (props: StyledProps<RawButtonProps, typeof rawButtonMapping>) => {
    return useCssElement(RNGHRawButton, props, rawButtonMapping);
  },
);

const baseButtonMapping: StyledConfiguration<typeof RNGHBaseButton> = {
  className: "style",
};

export const BaseButton = copyComponentProperties(
  RNGHBaseButton,
  (props: StyledProps<BaseButtonProps, typeof baseButtonMapping>) => {
    return useCssElement(RNGHBaseButton, props, baseButtonMapping);
  },
);

const rectButtonMapping: StyledConfiguration<typeof RNGHRectButton> = {
  className: "style",
};

export const RectButton = copyComponentProperties(
  RNGHRectButton,
  (props: StyledProps<RectButtonProps, typeof rectButtonMapping>) => {
    return useCssElement(RNGHRectButton, props, rectButtonMapping);
  },
);

const borderlessButtonMapping: StyledConfiguration<
  typeof RNGHBorderlessButton
> = {
  className: "style",
};

export const BorderlessButton = copyComponentProperties(
  RNGHBorderlessButton,
  (
    props: StyledProps<BorderlessButtonProps, typeof borderlessButtonMapping>,
  ) => {
    return useCssElement(RNGHBorderlessButton, props, borderlessButtonMapping);
  },
);

const pureNativeButtonMapping: StyledConfiguration<
  typeof RNGHPureNativeButton
> = {
  className: "style",
};

export const PureNativeButton = copyComponentProperties(
  RNGHPureNativeButton,
  (props: StyledProps<RawButtonProps, typeof pureNativeButtonMapping>) => {
    return useCssElement(RNGHPureNativeButton, props, pureNativeButtonMapping);
  },
);

const gestureHandlerRootViewMapping: StyledConfiguration<
  typeof RNGHGestureHandlerRootView
> = {
  className: "style",
};

/**
 * Gesture Handler's own `{ flex: 1 }`, restated because it reaches the root view through
 * `style ?? styles.container` over a module-private StyleSheet. Resolving a class is
 * exactly a thing that makes `style` present, so the wrapper has to supply the fallback
 * the `??` no longer reaches — and it applies on the same condition Gesture Handler
 * applies it: an inline style displaces it, a class does not.
 */
const rootViewDefault = StyleSheet.create({ container: { flex: 1 } });

export const GestureHandlerRootView = copyComponentProperties(
  RNGHGestureHandlerRootView,
  ({
    style,
    ...props
  }: StyledProps<
    ComponentProps<typeof RNGHGestureHandlerRootView>,
    typeof gestureHandlerRootViewMapping
  >) => {
    return useCssElement(
      RNGHGestureHandlerRootView,
      { ...props, style: style ?? rootViewDefault.container },
      gestureHandlerRootViewMapping,
    );
  },
);

const drawerLayoutAndroidMapping: StyledConfiguration<
  typeof RNGHDrawerLayoutAndroid
> = {
  className: "style",
};

export const DrawerLayoutAndroid = copyComponentProperties(
  RNGHDrawerLayoutAndroid,
  (
    props: StyledProps<
      ComponentProps<typeof RNGHDrawerLayoutAndroid>,
      typeof drawerLayoutAndroidMapping
    >,
  ) => {
    return useCssElement(
      RNGHDrawerLayoutAndroid,
      props,
      drawerLayoutAndroidMapping,
    );
  },
);
