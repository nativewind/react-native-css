import { Image as RNImage, type ImageProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

import { copyComponentProperties } from "./copyComponentProperties";

const mapping: StyledConfiguration<typeof RNImage> = {
  className: "style",
};

export const Image = copyComponentProperties(
  RNImage,
  (props: StyledProps<ImageProps, typeof mapping>) => {
    return useCssElement(RNImage, props, mapping);
  },
);

export default Image;
