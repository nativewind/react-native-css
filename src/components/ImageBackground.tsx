import {
  ImageBackground as RNImageBackground,
  type ImageBackgroundProps,
} from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

const mapping: StyledConfiguration<typeof RNImageBackground> = {
  className: {
    target: "style",
    nativeStyleMapping: {
      backgroundColor: true,
    },
  },
};

export function ImageBackground(
  props: StyledProps<ImageBackgroundProps, typeof mapping>,
) {
  return useCssElement(RNImageBackground, props, mapping);
}

export default ImageBackground;
