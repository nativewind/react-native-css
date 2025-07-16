import {
  ActivityIndicator as RNActivityIndicator,
  type ActivityIndicatorProps,
} from "react-native";

import { useCssElement, type StyledConfiguration } from "../runtime";

const mapping: StyledConfiguration<typeof RNActivityIndicator> = {
  className: {
    target: "style",
    nativeStyleMapping: {
      color: "color",
    },
  },
};

export function ActivityIndicator(props: ActivityIndicatorProps) {
  return useCssElement(RNActivityIndicator, props, mapping);
}
