import {
  Modal,
  ScrollView,
  StatusBar,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { styled as rootStyled } from "react-native-css";
import { FlatList as CssFlatList } from "react-native-css/components/FlatList";
import { Image as CssImage } from "react-native-css/components/Image";
import { ScrollView as CssScrollView } from "react-native-css/components/ScrollView";
import { Text as CssText } from "react-native-css/components/Text";
// Prewrapped component declarations must expose only real props and mapped sources.
import { View as CssView } from "react-native-css/components/View";
import { styled as nativeStyled } from "react-native-css/native";
import { styled as webStyled } from "react-native-css/web";

interface Props {
  required: number;
  style?: StyleProp<ViewStyle>;
}

function Base(_props: Props) {
  return null;
}

const Root = rootStyled(Base);
const Native = nativeStyled(Base);
const Web = webStyled(Base);
const Mapped = rootStyled(Base, { customClassName: "style" });

// This module is checked by TypeScript and deliberately excluded from Jest.
export const accepted = [
  <Root required={1} className="p-4" />,
  <Native required={1} className="p-4" />,
  <Web required={1} className="p-4" />,
  <Mapped required={1} customClassName="p-4" />,
];

export const rejected = [
  // @ts-expect-error The base component's required prop remains required.
  <Root className="p-4" />,
  // @ts-expect-error The base component's required prop remains required on native.
  <Native className="p-4" />,
  // @ts-expect-error The base component's required prop remains required on web.
  <Web className="p-4" />,
  // @ts-expect-error Class names must be strings.
  <Root required={1} className={4} />,
  // @ts-expect-error Class names must be strings on native.
  <Native required={1} className={4} />,
  // @ts-expect-error Class names must be strings on web.
  <Web required={1} className={4} />,
  // @ts-expect-error Explicit mapping adds its declared source only.
  <Mapped required={1} className="p-4" />,
];

// @ts-expect-error An explicit mapping must name a real target property.
rootStyled(Base, { customClassName: "missing" });

export const components = [
  <CssView className="p-4" />,
  <CssText className="text-red-500">Hello</CssText>,
  <CssImage source={{ uri: "test.png" }} className="w-4" />,
  <CssScrollView contentContainerClassName="p-4" />,
  <CssFlatList
    data={[1]}
    renderItem={({ item }) => <CssText>{item.toFixed()}</CssText>}
    columnWrapperClassName="gap-4"
  />,
];
export const invalidComponents = [
  // @ts-expect-error A wrapped View must reject unknown properties.
  <CssView nonexistent="p-4" />,
  // @ts-expect-error A wrapped Text must reject unknown properties.
  <CssText nonexistent="p-4" />,
  // @ts-expect-error A wrapped Image must reject unknown properties.
  <CssImage nonexistent="p-4" />,
  // @ts-expect-error A wrapped ScrollView must reject unknown properties.
  <CssScrollView nonexistent="p-4" />,
  // @ts-expect-error A wrapped FlatList must reject unknown properties.
  <CssFlatList data={[1]} renderItem={() => null} nonexistent="p-4" />,
];

export const removedLegacyProps = [
  // @ts-expect-error v5 has no cssInterop opt out prop.
  <View cssInterop={false} />,
  // @ts-expect-error Use placeholder: utilities on className instead.
  <TextInput placeholderClassName="text-red-500" />,
  // @ts-expect-error Use the React Native indicatorStyle prop.
  <ScrollView indicatorClassName="text-white" />,
  // @ts-expect-error Use the React Native presentationStyle prop.
  <Modal presentationClassName="p-4" />,
  // @ts-expect-error StatusBar is not an automatically styled component.
  <StatusBar className="bg-black" />,
];
