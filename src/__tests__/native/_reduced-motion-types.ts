import {
  reducedMotion as rootReducedMotion,
  type ReducedMotionPreference,
} from "react-native-css";
import { reducedMotion as nativeReducedMotion } from "react-native-css/native";
import { reducedMotion as webReducedMotion } from "react-native-css/web";

// This module is checked by TypeScript and deliberately excluded from Jest.
export const preferences: readonly (ReducedMotionPreference | undefined)[] = [
  rootReducedMotion.get(),
  nativeReducedMotion.get(),
  webReducedMotion.get(),
];

// @ts-expect-error get() is undefined until the device answers.
export const answered: ReducedMotionPreference = rootReducedMotion.get();

rootReducedMotion.set("reduce");
nativeReducedMotion.set("no-preference");
webReducedMotion.set(null);

// @ts-expect-error A preference is one of the keywords prefers-reduced-motion takes.
rootReducedMotion.set("bogus");
// @ts-expect-error A preference is one of the keywords prefers-reduced-motion takes, as written.
nativeReducedMotion.set("REDUCE");
// @ts-expect-error null, not an empty string, follows the device again.
webReducedMotion.set("");
// @ts-expect-error null, not undefined, follows the device again.
nativeReducedMotion.set(undefined);
// @ts-expect-error The preference is a keyword, not a boolean.
webReducedMotion.set(true);
