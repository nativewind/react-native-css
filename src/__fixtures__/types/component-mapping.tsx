/* eslint-disable @typescript-eslint/no-deprecated -- Verify the supported vars migration input. */
import { FlatList, Pressable, ScrollView } from "react-native";

import { vars as publicVars } from "react-native-css";
import { View } from "react-native-css/components";
import { styled, vars } from "react-native-css/native";

// Type checks cover recursive React Native component props without widening paths.
styled(FlatList, { className: "style" });
styled(Pressable, { className: "style" });
styled(ScrollView, {
  contentClassName: "contentContainerStyle",
});

// @ts-expect-error The mapping must still reject an unknown destination.
styled(ScrollView, { className: "missingStyle" });

export const variableStyle = <View style={vars({ width: 37 })} />;
export const publicVariableStyle = (
  <View style={publicVars({ "--width": "37px" })} />
);
