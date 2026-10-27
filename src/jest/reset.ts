import { Appearance, Dimensions } from "react-native";

import { StyleCollection } from "react-native-css/native";

import {
  colorScheme,
  dimensions,
  requestedColorScheme,
} from "../native/reactivity";

// Each test starts from what Appearance answers once a previous test's request is handed back, and from no request of this library's
export function resetBetweenTests(): void {
  StyleCollection.styles.clear();
  dimensions.set(Dimensions.get("window"));
  Appearance.setColorScheme("unspecified");
  colorScheme.set(Appearance.getColorScheme());
  requestedColorScheme.set(undefined);
}
