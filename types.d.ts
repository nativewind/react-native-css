/* eslint-disable @typescript-eslint/no-unused-vars */
// Every added prop is declared `| undefined` explicitly so the declarations
// hold under `exactOptionalPropertyTypes`, where `?: string` forbids passing an
// explicit `undefined` — which is what a conditional `className={x ? a : undefined}`
// spreads, and what every optional prop in React Native's own types already allows.
import type {
  ScrollViewProps,
  ScrollViewPropsAndroid,
  ScrollViewPropsIOS,
  Touchable,
  VirtualizedListProps,
} from "react-native";

declare module "@react-native/virtualized-lists" {
  export interface VirtualizedListWithoutRenderItemProps<ItemT>
    extends ScrollViewProps {
    ListFooterComponentClassName?: string | undefined;
    ListHeaderComponentClassName?: string | undefined;
  }
}

declare module "react-native" {
  interface ButtonProps {
    className?: string | undefined;
  }
  interface ScrollViewProps
    extends ViewProps,
      ScrollViewPropsIOS,
      ScrollViewPropsAndroid,
      Touchable {
    contentContainerClassName?: string | undefined;
    indicatorClassName?: string | undefined;
  }
  interface FlatListProps<ItemT> extends VirtualizedListProps<ItemT> {
    columnWrapperClassName?: string | undefined;
  }
  interface ImageBackgroundProps extends ImagePropsBase {
    imageClassName?: string | undefined;
  }
  interface ImagePropsBase {
    className?: string | undefined;
    cssInterop?: boolean | undefined;
  }
  interface ViewProps {
    className?: string | undefined;
    cssInterop?: boolean | undefined;
  }
  interface TextInputProps {
    placeholderClassName?: string | undefined;
  }
  interface TextProps {
    className?: string | undefined;
    cssInterop?: boolean | undefined;
  }
  interface SwitchProps {
    className?: string | undefined;
    cssInterop?: boolean | undefined;
  }
  interface InputAccessoryViewProps {
    className?: string | undefined;
    cssInterop?: boolean | undefined;
  }
  interface TouchableWithoutFeedbackProps {
    className?: string | undefined;
    cssInterop?: boolean | undefined;
  }
  interface StatusBarProps {
    className?: string | undefined;
    cssInterop?: boolean | undefined;
  }
  interface KeyboardAvoidingViewProps extends ViewProps {
    contentContainerClassName?: string | undefined;
  }
  interface ModalBaseProps {
    presentationClassName?: string | undefined;
  }
}
