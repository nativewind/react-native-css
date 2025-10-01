import {
  TouchableWithoutFeedback as RNTouchableWithoutFeedback,
  type TouchableWithoutFeedbackProps,
} from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

import { copyComponentProperties } from "./copyComponentProperties";

const mapping: StyledConfiguration<typeof RNTouchableWithoutFeedback> = {
  className: "style",
};

export const TouchableWithoutFeedback = copyComponentProperties(
  RNTouchableWithoutFeedback,
  (props: StyledProps<TouchableWithoutFeedbackProps, typeof mapping>) => {
    return useCssElement(RNTouchableWithoutFeedback, props, mapping);
  },
);

export default TouchableWithoutFeedback;
