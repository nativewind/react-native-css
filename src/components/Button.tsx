import { Button as RNButton, type ButtonProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

const mapping: StyledConfiguration<typeof RNButton> = {
  className: {
    target: false,
    nativeStyleMapping: {
      color: "color",
    },
  },
};

export function Button(props: StyledProps<ButtonProps, typeof mapping>) {
  return useCssElement(RNButton, props, mapping);
}

export default Button;
