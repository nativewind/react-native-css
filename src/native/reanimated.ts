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

    const createAnimatedComponent =
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access
      require("react-native-reanimated").createAnimatedComponent as (
        component: ComponentType,
      ) => ComponentType;

    return createAnimatedComponent(component);
  },
);
