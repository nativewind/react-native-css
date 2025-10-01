import { TextInput as RNTextInput, type TextInputProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

import { copyComponentProperties } from "./copyComponentProperties";

const mapping: StyledConfiguration<typeof RNTextInput> = {
  className: {
    target: "style",
    nativeStyleMapping: {
      textAlign: true,
    },
  },
};

export const TextInput = copyComponentProperties(
  RNTextInput,
  (props: StyledProps<TextInputProps, typeof mapping>) => {
    return useCssElement(RNTextInput, props, mapping);
  },
);

export default TextInput;
