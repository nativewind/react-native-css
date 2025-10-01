import { Pressable as RNPressable, type PressableProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

import { copyComponentProperties } from "./copyComponentProperties";

const mapping: StyledConfiguration<typeof RNPressable> = {
  className: "style",
};

export const Pressable = copyComponentProperties(
  RNPressable,
  (props: StyledProps<PressableProps, typeof mapping>) => {
    return useCssElement(RNPressable, props, mapping);
  },
);

export default Pressable;
