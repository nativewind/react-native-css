import { Text as RNText, type TextProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

import { copyComponentProperties } from "./copyComponentProperties";

const mapping = {
  className: "style",
} satisfies StyledConfiguration<typeof RNText>;

export const Text = copyComponentProperties(
  RNText,
  (props: StyledProps<TextProps, typeof mapping>) => {
    return useCssElement(RNText, props, mapping);
  },
);

export default Text;
