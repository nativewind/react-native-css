import { Appearance, Dimensions } from "react-native";

import { StyleCollection } from "react-native-css/native";

import { colorScheme, dimensions } from "../native/reactivity";

// Each test starts from the scheme the platform reports once a previous test's request is handed back
export function resetBetweenTests(): void {
  StyleCollection.styles.clear();
  dimensions.set(Dimensions.get("window"));
  Appearance.setColorScheme("unspecified");
  colorScheme.set(Appearance.getColorScheme());
}
