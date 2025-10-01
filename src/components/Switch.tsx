import { Switch as RNSwitch, type SwitchProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

import { copyComponentProperties } from "./copyComponentProperties";

const mapping = {
  className: "style",
} satisfies StyledConfiguration<typeof RNSwitch>;

export const Switch = copyComponentProperties(
  RNSwitch,
  (props: StyledProps<SwitchProps, typeof mapping>) => {
    return useCssElement(RNSwitch, props, mapping);
  },
);

export default Switch;
