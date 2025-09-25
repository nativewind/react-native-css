import {
  ActivityIndicator as RNActivityIndicator,
  type ActivityIndicatorProps,
} from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

const mapping: StyledConfiguration<typeof RNActivityIndicator> = {
  className: {
    target: "style",
    nativeStyleMapping: {
      color: "color",
    },
  },
};

export function ActivityIndicator(
  props: StyledProps<ActivityIndicatorProps, typeof mapping>,
) {
  return useCssElement(RNActivityIndicator, props, mapping);
}

export default ActivityIndicator;
