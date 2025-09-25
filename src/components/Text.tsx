import { Text as RNText, type TextProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

const mapping = {
  className: "style",
} satisfies StyledConfiguration<typeof RNText>;

export function Text(props: StyledProps<TextProps, typeof mapping>) {
  return useCssElement(RNText, props, mapping);
}

export default Text;
