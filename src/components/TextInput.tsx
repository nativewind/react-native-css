import { TextInput as RNTextInput, type TextInputProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

const mapping: StyledConfiguration<typeof RNTextInput> = {
  className: {
    target: "style",
    nativeStyleMapping: {
      textAlign: true,
    },
  },
};

export function TextInput(props: StyledProps<TextInputProps, typeof mapping>) {
  return useCssElement(RNTextInput, props, mapping);
}

export default TextInput;
