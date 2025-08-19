import {
  ActivityIndicator as RNActivityIndicator,
  type ActivityIndicatorProps,
} from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "../runtime";

const mapping = {
  className: {
    target: "style",
    nativeStyleMapping: {
      color: "color",
    },
  },
} satisfies StyledConfiguration<typeof RNActivityIndicator>;

export function ActivityIndicator(
  props: StyledProps<ActivityIndicatorProps, typeof mapping>,
) {
  return useCssElement(RNActivityIndicator, props, mapping);
}

export default ActivityIndicator;
