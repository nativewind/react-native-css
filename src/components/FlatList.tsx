import { FlatList as RNFlatList, type FlatListProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "../runtime";

const mapping = {
  columnWrapperStyle: "columnWrapperStyle",
  listFooterComponentClassName: "ListFooterComponentStyle",
  listHeaderComponentClassName: "ListHeaderComponentStyle",
} satisfies StyledConfiguration<typeof RNFlatList>;

export function FlatList<ItemT>(
  props: StyledProps<FlatListProps<ItemT>, typeof mapping>,
) {
  return useCssElement(RNFlatList, props, mapping);
}

export default FlatList;
