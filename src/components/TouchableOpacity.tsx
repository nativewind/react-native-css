import {
  TouchableOpacity as RNTouchableOpacity,
  type TouchableOpacityProps,
} from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

const mapping: StyledConfiguration<typeof RNTouchableOpacity> = {
  className: "style",
};

export function TouchableOpacity(
  props: StyledProps<TouchableOpacityProps, typeof mapping>,
) {
  return useCssElement(RNTouchableOpacity, props, mapping);
}

export default TouchableOpacity;
