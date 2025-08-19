import { Button as RNButton, type ButtonProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "../runtime";

const mapping = {
  className: {
    target: false,
    nativeStyleMapping: {
      color: "color",
    },
  },
} satisfies StyledConfiguration<typeof RNButton>;

export function Button(props: StyledProps<ButtonProps, typeof mapping>) {
  return useCssElement(RNButton, props, mapping);
}

export default Button;
