import { Appearance, Dimensions } from "react-native";
import type { ColorSchemeName, LayoutRectangle } from "react-native";

import type {
  LightDarkVariable,
  StyleDescriptor,
  StyleRuleSet,
} from "../../compiler";
import { Config } from "./native.types";
import { writeAnimation } from "./reanimated/defaults";
import { isDeepEqual } from "./utils/equality";
import { family, observable, weakFamily } from "./utils/observable";

/**
 * In development, these are observable to allow for hot-reloading.
 * In production these will be static StyleRuleSets.
 */
export const styleFamily = family((name) => {
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }

  const obs = observable<StyleRuleSet>(undefined, undefined, isDeepEqual);
  obs.name = name;

  return obs;
});

export const inlineStylesMap = new WeakMap<
  WeakKey,
  StyleRuleSet | { classNames: string[]; config: Config }
>();

export const animationFamily = family(() => {
  return observable(undefined, writeAnimation, isDeepEqual);
});

export const rem = observable(14);
rem.name = "rem";

/********************************* Variables **********************************/

const buildGlobalVariableFamily = (type: "root" | "universal") => {
  return family((name) => {
    let light: StyleDescriptor;
    let dark: StyleDescriptor;

    const obs = observable(
      (get) => {
        return get(appColorScheme) === "dark" ? (dark ?? light) : light;
      },
      (utils, values: LightDarkVariable) => {
        light = values[0];
        dark = values[1];
        return utils.get(appColorScheme) === "dark" ? dark : light;
      },
    );

    obs.name = `${type}[${name}]`;

    return obs;
  });
};
export const rootVariables = buildGlobalVariableFamily("root");
export const universalVariables = buildGlobalVariableFamily("universal");

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
dimensions.name = "dimensions";
export const vw = observable((read) => read(dimensions).width);
vw.name = "vw";
export const vh = observable((read) => read(dimensions).height);
vh.name = "vh";

/******************************* Color Scheme *********************************/

export const appColorScheme = observable(
  () => {
    return Appearance.getColorScheme();
  },
  (_, value: ColorSchemeName) => {
    Appearance.setColorScheme(value);
    return value ?? Appearance.getColorScheme();
  },
);
appColorScheme.name = "appColorScheme";

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
