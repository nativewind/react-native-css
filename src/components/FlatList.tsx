import { FlatList as RNFlatList, type FlatListProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

const mapping: StyledConfiguration<typeof RNFlatList> = {
  ListFooterComponentClassName: "ListFooterComponentStyle",
  ListHeaderComponentClassName: "ListHeaderComponentStyle",
  columnWrapperClassName: "columnWrapperStyle",
  contentContainerClassName: "contentContainerStyle",
};

export function FlatList<ItemT>(
  props: StyledProps<FlatListProps<ItemT>, typeof mapping>,
) {
  return useCssElement(RNFlatList, props, mapping);
}

export default FlatList;
