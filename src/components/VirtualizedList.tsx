import type { ReactNode } from "react";
import {
  VirtualizedList as RNVirtualizedList,
  type VirtualizedListProps,
} from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

import { copyComponentProperties } from "./copyComponentProperties";

const mapping: StyledConfiguration<typeof RNVirtualizedList> = {
  className: "style",
  ListFooterComponentClassName: "ListFooterComponentStyle",
  ListHeaderComponentClassName: "ListHeaderComponentStyle",
  contentContainerClassName: "contentContainerStyle",
};

export const VirtualizedList = copyComponentProperties(
  RNVirtualizedList,
  function <ItemT>(
    props: StyledProps<VirtualizedListProps<ItemT>, typeof mapping>,
  ) {
    return useCssElement(RNVirtualizedList, props, mapping);
  },
) as unknown as typeof RNVirtualizedList &
  (<ItemT>(
    props: StyledProps<
      VirtualizedListProps<ItemT>,
      StyledConfiguration<typeof RNVirtualizedList>
    >,
  ) => ReactNode);

export default VirtualizedList;
