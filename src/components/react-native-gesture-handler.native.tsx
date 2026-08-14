import type { ComponentProps } from "react";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";
import {
  BaseButton as RNGHBaseButton,
  BorderlessButton as RNGHBorderlessButton,
  DrawerLayoutAndroid as RNGHDrawerLayoutAndroid,
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
 * ReanimatedDrawerLayout and ReanimatedSwipeable are out of reach entirely: gesture-handler
 * ships them as their own entry points rather than from its index, and the resolver branch
 * matching this module is an exact `react-native-gesture-handler`.
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
