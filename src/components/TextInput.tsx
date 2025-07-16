import { TextInput as RNTextInput, type TextInputProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "../runtime";

const mapping = {
  className: {
    target: "style",
    nativeStyleMapping: {
      selectionColor: "selectionColor",
    },
  },
} satisfies StyledConfiguration<typeof RNTextInput>;

export function TextInput(props: StyledProps<TextInputProps, typeof mapping>) {
  return useCssElement(RNTextInput, props, mapping);
}
