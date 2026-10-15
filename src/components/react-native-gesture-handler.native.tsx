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

type RootViewProps = ComponentProps<typeof RNGHGestureHandlerRootView>;

// Gesture Handler applies its own flex: 1 through `style ?? styles.container`, which a resolved class would displace
const rootViewDefault = StyleSheet.create({ container: { flex: 1 } });

const flexSizingProperties = [
  "flex",
  "flexGrow",
  "flexShrink",
  "flexBasis",
] as const;

// Yoga reads a positive flex over an explicit or absent basis, so a class that sizes the root itself replaces the default rather than sitting beside it
function resolveRootViewStyle(
  style: RootViewProps["style"],
  hasInlineStyle: boolean,
): RootViewProps["style"] {
  if (hasInlineStyle) {
    return style;
  }
  if (style === undefined) {
    return rootViewDefault.container;
  }
  const resolved = StyleSheet.flatten(style);
  return flexSizingProperties.some(
    (property) => resolved[property] !== undefined,
  )
    ? style
    : [style, rootViewDefault.container];
}

function RootViewWithDefault({
  hasInlineStyle,
  style,
  ...props
}: RootViewProps & { hasInlineStyle: boolean }) {
  return (
    <RNGHGestureHandlerRootView
      {...props}
      style={resolveRootViewStyle(style, hasInlineStyle)}
    />
  );
}

const gestureHandlerRootViewMapping: StyledConfiguration<
  typeof RootViewWithDefault
> = {
  className: "style",
};

export const GestureHandlerRootView = copyComponentProperties(
  RNGHGestureHandlerRootView,
  (props: StyledProps<RootViewProps, typeof gestureHandlerRootViewMapping>) => {
    return useCssElement(
      RootViewWithDefault,
      { ...props, hasInlineStyle: props.style !== undefined },
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
