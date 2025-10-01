import {
  TouchableHighlight as RNTouchableHighlight,
  type TouchableHighlightProps,
} from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

import { copyComponentProperties } from "./copyComponentProperties";

const mapping: StyledConfiguration<typeof RNTouchableHighlight> = {
  className: "style",
};

export const TouchableHighlight = copyComponentProperties(
  RNTouchableHighlight,
  (props: StyledProps<TouchableHighlightProps, typeof mapping>) => {
    return useCssElement(RNTouchableHighlight, props, mapping);
  },
);

export default TouchableHighlight;
