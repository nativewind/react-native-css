import {
  VirtualizedList as RNVirtualizedList,
  type VirtualizedListProps,
} from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

const mapping: StyledConfiguration<typeof RNVirtualizedList> = {
  className: "style",
  ListFooterComponentClassName: "ListFooterComponentStyle",
  ListHeaderComponentClassName: "ListHeaderComponentStyle",
  contentContainerClassName: "contentContainerStyle",
};

export function VirtualizedList<ItemT>(
  props: StyledProps<VirtualizedListProps<ItemT>, typeof mapping>,
) {
  return useCssElement(RNVirtualizedList, props, mapping);
}

export default VirtualizedList;
