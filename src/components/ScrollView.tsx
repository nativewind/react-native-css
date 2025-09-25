import { ScrollView as RNScrollView, type ScrollViewProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

const mapping: StyledConfiguration<typeof RNScrollView> = {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
};

export function ScrollView(
  props: StyledProps<ScrollViewProps, typeof mapping>,
) {
  return useCssElement(RNScrollView, props, mapping);
}

export default ScrollView;
