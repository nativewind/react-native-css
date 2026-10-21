import { Appearance, Dimensions } from "react-native";

import {
  colorScheme,
  reducedMotion,
  StyleCollection,
} from "react-native-css/native";
import {
  deviceReducedMotion,
  deviceReducedMotionAnswer,
  dimensions,
} from "react-native-css/native-internal";

// The components a consumer's suite renders read the package's own build, so the reset reaches them through the package's entry; a test may fire React Native's reduceMotionChanged, so the device goes back to AccessibilityInfo's answer, or waits for it
export function resetBetweenTests(): void {
  StyleCollection.styles.clear();
  dimensions.set(Dimensions.get("window"));
  Appearance.setColorScheme("unspecified");
  colorScheme.set(null);
  deviceReducedMotion.set(deviceReducedMotionAnswer.get());
  reducedMotion.set(null);
}
