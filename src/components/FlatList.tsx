import type { ReactNode } from "react";
import { FlatList as RNFlatList, type FlatListProps } from "react-native";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";

import { copyComponentProperties } from "./copyComponentProperties";

const mapping: StyledConfiguration<typeof RNFlatList> = {
  ListFooterComponentClassName: "ListFooterComponentStyle",
  ListHeaderComponentClassName: "ListHeaderComponentStyle",
  columnWrapperClassName: "columnWrapperStyle",
  contentContainerClassName: "contentContainerStyle",
};

export const FlatList = copyComponentProperties(RNFlatList, function <
  ItemT,
>(props: StyledProps<FlatListProps<ItemT>, typeof mapping>) {
  return useCssElement(RNFlatList, props, mapping);
}) as unknown as typeof RNFlatList &
  (<ItemT>(
    props: StyledProps<
      FlatListProps<ItemT>,
      StyledConfiguration<typeof RNFlatList>
    >,
  ) => ReactNode);

export default FlatList;
