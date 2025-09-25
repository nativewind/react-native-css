import {
  TouchableWithoutFeedback as RNTouchableWithoutFeedback,
  type TouchableWithoutFeedbackProps,
} from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

const mapping: StyledConfiguration<typeof RNTouchableWithoutFeedback> = {
  className: "style",
};

export function TouchableWithoutFeedback(
  props: StyledProps<TouchableWithoutFeedbackProps, typeof mapping>,
) {
  return useCssElement(RNTouchableWithoutFeedback, props, mapping);
}

export default TouchableWithoutFeedback;
