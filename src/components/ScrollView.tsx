import { ScrollView as RNScrollView, type ScrollViewProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

import { copyComponentProperties } from "./copyComponentProperties";

const mapping: StyledConfiguration<typeof RNScrollView> = {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
};

export const ScrollView = copyComponentProperties(
  RNScrollView,
  (props: StyledProps<ScrollViewProps, typeof mapping>) => {
    return useCssElement(RNScrollView, props, mapping);
  },
);

export default ScrollView;
