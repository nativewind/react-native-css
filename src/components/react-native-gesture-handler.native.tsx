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
 * `Pressable` and the button family render `GestureHandlerButton` — a codegen'd
 * native component — so the `react-native` rewrite never reaches them and
 * `className` falls through their prop spread onto a view that declares no such
 * prop. Each one does forward `style`, which is what these mappings target.
 *
 * The components NOT re-declared here are already className-aware, and
 * re-wrapping them would style the gesture handler's own wrapper rather than
 * the view: `ScrollView`, `Switch`, `TextInput` and `FlatList` are built with
 * `createNativeWrapper`, which forwards every prop it does not claim for the
 * handler down to a React Native primitive, and `Text` renders one directly.
 *
 * Three groups are deliberately left alone:
 *
 * - **The touchables.** `className` is dropped on them too, but gesture-handler
 *   deprecates all four in favour of `Pressable`, so wrapping them would add a
 *   surface that is scheduled for removal. `TouchableNativeFeedback` has a
 *   second reason: only its `.android` variant is gesture-handler's own, and
 *   every other platform re-exports React Native's, which the rewrite already
 *   reaches.
 * - **`DrawerLayout` and `Swipeable`.** Neither takes a plain `style` prop —
 *   they expose `containerStyle`, `childrenContainerStyle` and
 *   `drawerContainerStyle` — so which one `className` should target is a design
 *   decision rather than a mechanical mapping.
 * - **`DrawerLayoutAndroid` and `RefreshControl`.** Gesture Handler builds both
 *   with `createNativeWrapper` too, so they would inherit the rewrite like the
 *   rest of that group — except `components/index.cts` re-exports these two
 *   straight from `react-native` instead of styling them, so there is no styled
 *   twin for them to inherit from.
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
