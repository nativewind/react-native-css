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

// These render a native view the react-native rewrite never reaches, so each maps className to the style it forwards
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

// Gesture Handler applies its own flex: 1 through `style ?? styles.container`, which a resolved class would displace
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
