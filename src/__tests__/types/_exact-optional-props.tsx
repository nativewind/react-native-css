import type {
  ButtonProps,
  FlatListProps,
  ImageBackgroundProps,
  ImageProps,
  InputAccessoryViewProps,
  KeyboardAvoidingViewProps,
  ModalProps,
  ScrollViewProps,
  StatusBarProps,
  SwitchProps,
  TextInputProps,
  TextProps,
  TouchableWithoutFeedbackProps,
  ViewProps,
} from "react-native";

import type { VirtualizedListWithoutRenderItemProps } from "@react-native/virtualized-lists";

// Every prop this package adds must accept an explicit `undefined`, as React Native's own
// optional props already do. Under `exactOptionalPropertyTypes` a bare `?: string` rejects
// it, so `className={condition ? "p-4" : undefined}` — the ordinary conditional — fails.
// This file compiles with that flag on; the root typecheck cannot observe the difference.
declare const maybeString: string | undefined;
declare const maybeBoolean: boolean | undefined;
declare const noop: () => void;

export const view: ViewProps = {
  className: maybeString,
  cssInterop: maybeBoolean,
};

export const text: TextProps = {
  className: maybeString,
  cssInterop: maybeBoolean,
};

export const image: ImageProps = {
  className: maybeString,
  cssInterop: maybeBoolean,
};

export const switchProps: SwitchProps = {
  className: maybeString,
  cssInterop: maybeBoolean,
};

export const inputAccessoryView: InputAccessoryViewProps = {
  className: maybeString,
  cssInterop: maybeBoolean,
};

export const touchableWithoutFeedback: TouchableWithoutFeedbackProps = {
  className: maybeString,
  cssInterop: maybeBoolean,
};

export const statusBar: StatusBarProps = {
  className: maybeString,
  cssInterop: maybeBoolean,
};

export const button: ButtonProps = {
  title: "",
  onPress: noop,
  className: maybeString,
};

export const scrollView: ScrollViewProps = {
  contentContainerClassName: maybeString,
  indicatorClassName: maybeString,
};

export const flatList: FlatListProps<unknown> = {
  data: [],
  renderItem: () => null,
  columnWrapperClassName: maybeString,
};

export const imageBackground: ImageBackgroundProps = {
  source: 0,
  imageClassName: maybeString,
};

export const textInput: TextInputProps = {
  placeholderClassName: maybeString,
};

export const keyboardAvoidingView: KeyboardAvoidingViewProps = {
  contentContainerClassName: maybeString,
};

export const modal: ModalProps = {
  presentationClassName: maybeString,
};

export const virtualizedList: VirtualizedListWithoutRenderItemProps<unknown> = {
  data: [],
  getItem: () => undefined,
  getItemCount: () => 0,
  ListFooterComponentClassName: maybeString,
  ListHeaderComponentClassName: maybeString,
};
