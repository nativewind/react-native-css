import type {
  ButtonProps,
  FlatListProps,
  ImageBackgroundProps,
  ImageProps,
  KeyboardAvoidingViewProps,
  ScrollViewProps,
  SwitchProps,
  TextProps,
  TouchableWithoutFeedbackProps,
  ViewProps,
} from "react-native";

import type { VirtualizedListWithoutRenderItemProps } from "@react-native/virtualized-lists";

// Compiled with exactOptionalPropertyTypes, where a bare `?: string` rejects an explicit undefined
declare const maybeString: string | undefined;
declare const noop: () => void;

export const view: ViewProps = {
  className: maybeString,
};

export const text: TextProps = {
  className: maybeString,
};

export const image: ImageProps = {
  className: maybeString,
};

export const switchProps: SwitchProps = {
  className: maybeString,
};

export const touchableWithoutFeedback: TouchableWithoutFeedbackProps = {
  className: maybeString,
};

export const button: ButtonProps = {
  title: "",
  onPress: noop,
  className: maybeString,
};

export const scrollView: ScrollViewProps = {
  contentContainerClassName: maybeString,
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

export const keyboardAvoidingView: KeyboardAvoidingViewProps = {
  contentContainerClassName: maybeString,
};

export const virtualizedList: VirtualizedListWithoutRenderItemProps<unknown> = {
  data: [],
  getItem: () => undefined,
  getItemCount: () => 0,
  ListFooterComponentClassName: maybeString,
  ListHeaderComponentClassName: maybeString,
};
