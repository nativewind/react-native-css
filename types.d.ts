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
    ListFooterComponentClassName?: string;
    ListHeaderComponentClassName?: string;
  }
}

declare module "react-native" {
  interface ButtonProps {
    className?: string;
  }
  interface ScrollViewProps
    extends ViewProps,
      ScrollViewPropsIOS,
      ScrollViewPropsAndroid,
      Touchable {
    contentContainerClassName?: string;
  }
  interface FlatListProps<ItemT> extends VirtualizedListProps<ItemT> {
    columnWrapperClassName?: string;
  }
  interface ImageBackgroundProps extends ImagePropsBase {
    imageClassName?: string;
  }
  interface ImagePropsBase {
    className?: string;
  }
  interface ViewProps {
    className?: string;
    /** The element's directionality: HTML's dir, which :dir() matches and descendants inherit */
    dir?: "ltr" | "rtl";
  }
  interface TextProps {
    className?: string;
    dir?: "ltr" | "rtl";
  }
  interface SwitchProps {
    className?: string;
  }
  interface TouchableWithoutFeedbackProps {
    className?: string;
  }
  interface KeyboardAvoidingViewProps extends ViewProps {
    contentContainerClassName?: string;
  }
}
