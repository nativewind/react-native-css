import { Appearance, Dimensions } from "react-native";
import type { ColorSchemeName, LayoutRectangle } from "react-native";

import { StyleDescriptor, StyleRuleSet } from "../runtime.types";
import { Config } from "./native.types";
import { writeAnimation } from "./reanimated";
import { isDeepEqual } from "./utils/equality";
import { family, mutable, observable, weakFamily } from "./utils/observable";

/**
 * In development, these are observable to allow for hot-reloading.
 * In production these will be static StyleRuleSets.
 */
export const styleFamily = family(() => {
  return process.env.NODE_ENV === "production"
    ? undefined //mutable<StyleRuleSet>(undefined, undefined, isDeepEqual)
    : observable<StyleRuleSet>(undefined, undefined, isDeepEqual);
});

export const inlineStylesMap = new WeakMap<
  WeakKey,
  StyleRuleSet | { classNames: string[]; config: Config }
>();

export const animationFamily = family(() => {
  return process.env.NODE_ENV === "production"
    ? mutable(undefined, writeAnimation, isDeepEqual)
    : observable(undefined, writeAnimation, isDeepEqual);
});

export const rem = observable(14);

/********************************* Variables **********************************/

const buildGlobalVariableFamily = () => {
  return family(() => {
    const lightObs = observable<StyleDescriptor>();
    const darkObs = observable<StyleDescriptor>();

    return observable<
      StyleDescriptor,
      [light: StyleDescriptor, dark: StyleDescriptor]
    >(
      (get) => {
        const colorScheme = get(appColorScheme);
        return colorScheme === "dark" ? get(darkObs) : get(lightObs);
      },
      (set, light: StyleDescriptor, dark: StyleDescriptor) => {
        set(lightObs, light);
        set(darkObs, dark);
        return light;
      },
      /**
       * This observable is only used for setting the values of other observables.
       * Ignore any write values
       */
      () => true,
    );
  });
};
export const rootVariables = buildGlobalVariableFamily();
export const universalVariables = buildGlobalVariableFamily();

/****************************** Pseudo Classes ********************************/

export const hoverFamily = weakFamily(() => {
  return observable<boolean>(false);
});

export const activeFamily = weakFamily(() => {
  return observable<boolean>(false);
});

export const focusFamily = weakFamily(() => {
  return observable<boolean>(false);
});

/******************************* Dimensions ***********************************/

export const dimensions = observable(Dimensions.get("window"));
export const vw = observable((read) => read(dimensions).width);
export const vh = observable((read) => read(dimensions).height);

/******************************* Color Scheme *********************************/

export const systemColorScheme = observable<ColorSchemeName>();
export const appColorScheme = observable(
  (get) => {
    const value = get(systemColorScheme);
    return get(systemColorScheme) === undefined
      ? Appearance.getColorScheme()
      : value;
  },
  (set, value: ColorSchemeName) => {
    set(systemColorScheme, value);
    return value === undefined ? Appearance.getColorScheme() : value;
  },
);

/******************************* Containers ***********************************/

export const containerLayoutFamily = weakFamily(() => {
  return observable<LayoutRectangle>();
});

export const containerWidthFamily = weakFamily((key) => {
  return observable((get) => {
    return get(containerLayoutFamily(key))?.width || 0;
  });
});

export const containerHeightFamily = weakFamily((key) => {
  return observable((get) => {
    return get(containerLayoutFamily(key))?.width || 0;
  });
});

/***************************** Reduced Motion *********************************/

declare global {
  /**
   * React Native does off AccessibilityInfo.isReduceMotionEnabled but this returns
   * a promise. If an app supports reduced motion, its probably just for animations
   * so the app most likely has the reanimated library installed.
   *
   * @see https://github.com/software-mansion/react-native-reanimated/blob/6fad03e080c8ea4919f35fefab659078b0f08e51/packages/react-native-reanimated/src/ReducedMotion.ts#L7-L13
   */
  var _REANIMATED_IS_REDUCED_MOTION: boolean;
}

export const prefersReducedMotion = globalThis._REANIMATED_IS_REDUCED_MOTION;
