/* eslint-disable @typescript-eslint/no-unused-vars */
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
  }
  interface FlatListProps<ItemT> extends VirtualizedListProps<ItemT> {
    columnWrapperClassName?: string | undefined;
  }
  interface ImageBackgroundProps extends ImagePropsBase {
    imageClassName?: string | undefined;
  }
  interface ImagePropsBase {
    className?: string | undefined;
  }
  interface ViewProps {
    className?: string | undefined;
  }
  interface TextProps {
    className?: string | undefined;
  }
  interface SwitchProps {
    className?: string | undefined;
  }
  interface TouchableWithoutFeedbackProps {
    className?: string | undefined;
  }
  interface KeyboardAvoidingViewProps extends ViewProps {
    contentContainerClassName?: string | undefined;
  }
}
