import {
  ImageBackground as RNImageBackground,
  type ImageBackgroundProps,
} from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

import { copyComponentProperties } from "./copyComponentProperties";

const mapping: StyledConfiguration<typeof RNImageBackground> = {
  className: {
    target: "style",
    nativeStyleMapping: {
      backgroundColor: true,
    },
  },
};

export const ImageBackground = copyComponentProperties(
  RNImageBackground,
  (props: StyledProps<ImageBackgroundProps, typeof mapping>) => {
    return useCssElement(RNImageBackground, props, mapping);
  },
);

export default ImageBackground;
