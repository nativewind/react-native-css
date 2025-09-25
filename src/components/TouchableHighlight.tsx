import {
  TouchableHighlight as RNTouchableHighlight,
  type TouchableHighlightProps,
} from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

const mapping: StyledConfiguration<typeof RNTouchableHighlight> = {
  className: "style",
};

export function TouchableHighlight(
  props: StyledProps<TouchableHighlightProps, typeof mapping>,
) {
  return useCssElement(RNTouchableHighlight, props, mapping);
}

export default TouchableHighlight;
