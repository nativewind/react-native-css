import { I18nManager, PixelRatio, Platform } from "react-native";

import type { MediaCondition } from "react-native-css/compiler";

import { colorScheme, vh, vw, type Getter } from "../reactivity";
import {
  compareMediaFeature,
  evaluateCondition,
  type MeasuredFeatureValue,
  type MediaComparison,
  type MediaFeatureName,
} from "./compare";
import { matches, type Truth } from "./kleene";

// The color feature counts bits per color component
const BITS_PER_COLOR_COMPONENT = 8;

export function testMediaQuery(mediaQueries: MediaCondition[], get: Getter) {
  return mediaQueries.every((query) => matches(test(query, get)));
}

function test(mediaQuery: Readonly<MediaCondition>, get: Getter): Truth {
  return evaluateCondition(mediaQuery, {
    read: (name) => getMediaFeatureValue(name, get),
    compare: (comparison) => testComparison(comparison, get),
  });
}

function testComparison(
  mediaQuery: Readonly<MediaComparison>,
  get: Getter,
): Truth {
  const [operator, name, value] = mediaQuery;

  switch (name) {
    // dir and platform are this library's conditions rather than media features, so neither has a boolean context
    case "dir":
      return compareMediaFeature(
        operator,
        I18nManager.isRTL ? "rtl" : "ltr",
        value,
      );
    case "platform":
    case "display-mode":
      return (
        value === "native" || compareMediaFeature(operator, Platform.OS, value)
      );
    default:
      return compareMediaFeature(
        operator,
        getMediaFeatureValue(name, get),
        value,
      );
  }
}

function getMediaFeatureValue(
  name: MediaFeatureName,
  get: Getter,
): MeasuredFeatureValue {
  switch (name) {
    case "hover":
    case "any-hover":
      return PRIMARY_INPUT_FEATURES[primaryInput()].hover;
    case "pointer":
    case "any-pointer":
      return PRIMARY_INPUT_FEATURES[primaryInput()].pointer;
    case "display-mode":
      return Platform.OS;
    case "prefers-color-scheme":
      return get(colorScheme) ?? undefined;
    case "color":
      return BITS_PER_COLOR_COMPONENT;
    // A React Native screen is a full-color bitmap that redraws as fast as scripts change it
    case "color-index":
    case "monochrome":
    case "grid":
      return 0;
    case "scripting":
      return "enabled";
    case "update":
      return "fast";
    case "width":
      return get(vw);
    case "height":
      return get(vh);
    case "resolution":
      return PixelRatio.get();
    case "orientation":
      return get(vh) < get(vw) ? "landscape" : "portrait";
    default:
      return undefined;
  }
}

type PrimaryInput = "touchscreen" | "mouse" | "remote";

// A TV's remote moves focus rather than a pointer, and Mac Catalyst runs an iOS app under a mouse
function primaryInput(): PrimaryInput {
  if (Platform.isTV) {
    return "remote";
  }

  if (Platform.OS === "ios") {
    return Platform.isMacCatalyst === true ? "mouse" : "touchscreen";
  }

  return Platform.OS === "android" ? "touchscreen" : "mouse";
}

// MQ5 §7 answers for the primary input, as Safari and Chrome do on a phone or tablet with or without a mouse attached; the inputs beside it are not visible to JavaScript, so any-pointer and any-hover answer for it too
const PRIMARY_INPUT_FEATURES = {
  touchscreen: { pointer: "coarse", hover: "none" },
  mouse: { pointer: "fine", hover: "hover" },
  remote: { pointer: "none", hover: "none" },
} as const satisfies Readonly<
  Record<PrimaryInput, { readonly pointer: string; readonly hover: string }>
>;
