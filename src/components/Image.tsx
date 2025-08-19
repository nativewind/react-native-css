import { Image as RNImage, type ImageProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "../runtime";

const mapping = {
  className: "style",
} satisfies StyledConfiguration<typeof RNImage>;

export function Image(props: StyledProps<ImageProps, typeof mapping>) {
  return useCssElement(RNImage, props, mapping);
}

export default Image;
