import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";
import {
  BaseButton as RNGHBaseButton,
  BorderlessButton as RNGHBorderlessButton,
  Pressable as RNGHPressable,
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
 *
 * Not re-declared, and why:
 *
 * - ScrollView, Switch, TextInput, FlatList, Text — already className-aware; wrapping
 *   them would style the gesture handler's wrapper rather than the view.
 * - The four touchables — className is dropped there too, but gesture-handler deprecates
 *   them in favour of Pressable. TouchableNativeFeedback is additionally gesture-handler's
 *   own only on Android; elsewhere it re-exports React Native's, which the rewrite reaches.
 * - DrawerLayout, Swipeable — no plain `style` prop, only containerStyle /
 *   childrenContainerStyle / drawerContainerStyle, so the target is a design decision.
 * - DrawerLayoutAndroid, RefreshControl — components/index.cts re-exports these straight
 *   from react-native, so there is no styled twin for them to inherit from.
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
