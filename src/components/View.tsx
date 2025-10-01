import { View as RNView, type ViewProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

import { copyComponentProperties } from "./copyComponentProperties";

const mapping = {
  className: "style",
} satisfies StyledConfiguration<typeof RNView>;

export const View = copyComponentProperties(
  RNView,
  (props: StyledProps<ViewProps, typeof mapping>) => {
    return useCssElement(RNView, props, mapping);
  },
);

export default View;
