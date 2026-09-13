import type { ComponentType } from "react";

import { weakFamily } from "./reactivity";

export const animatedComponentFamily = weakFamily(
  (component: ComponentType) => {
    if (
      "displayName" in component &&
      component.displayName?.startsWith("Animated.")
    ) {
      return component;
    }

    // Reanimated 4.5 keeps the original component display name. Compare its
    // public built-in components by identity instead of interpreting that name.
    const reanimated =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("react-native-reanimated") as typeof import("react-native-reanimated");
    const animated = reanimated.default;
    if (
      [
        animated.View,
        animated.Text,
        animated.Image,
        animated.ScrollView,
        animated.FlatList,
      ].some((value) => value === component)
    ) {
      return component;
    }

    // This public constructor remains supported for arbitrary components; only
    // its FlatList-specific overload is deprecated by Reanimated.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const createAnimatedComponent = reanimated.createAnimatedComponent as (
      component: ComponentType,
    ) => ComponentType;

    return createAnimatedComponent(component);
  },
);
