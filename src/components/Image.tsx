import { Image as RNImage, type ImageProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

const mapping: StyledConfiguration<typeof RNImage> = {
  className: "style",
};

export function Image(props: StyledProps<ImageProps, typeof mapping>) {
  return useCssElement(RNImage, props, mapping);
}

export default Image;
