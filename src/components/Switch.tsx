import { Switch as RNSwitch, type SwitchProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

const mapping = {
  className: "style",
} satisfies StyledConfiguration<typeof RNSwitch>;

export function Switch(props: StyledProps<SwitchProps, typeof mapping>) {
  return useCssElement(RNSwitch, props, mapping);
}

export default Switch;
