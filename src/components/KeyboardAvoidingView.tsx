import {
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  type KeyboardAvoidingViewProps,
} from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

import { copyComponentProperties } from "./copyComponentProperties";

const mapping: StyledConfiguration<typeof RNKeyboardAvoidingView> = {
  className: {
    target: "style",
  },
};

export const KeyboardAvoidingView = copyComponentProperties(
  RNKeyboardAvoidingView,
  (props: StyledProps<KeyboardAvoidingViewProps, typeof mapping>) => {
    return useCssElement(RNKeyboardAvoidingView, props, mapping);
  },
);

export default KeyboardAvoidingView;
