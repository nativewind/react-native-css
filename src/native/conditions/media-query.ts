import { I18nManager, PixelRatio, Platform } from "react-native";

import type {
  MediaCondition,
  MediaFeatureComparison,
  MediaFeatureOperand,
} from "react-native-css/compiler";

import { colorScheme, vh, vw, type Getter } from "../reactivity";
import {
  compareMediaFeature,
  evaluateCondition,
  testAspectRatio,
  testMediaFeatureInterval,
  type FeatureReader,
  type MeasuredFeatureValue,
  type MediaComparison,
  type MediaFeatureName,
  type MediaInterval,
} from "./compare";
import { matches, UNKNOWN, type Truth } from "./kleene";

// The color feature counts bits per color component
const BITS_PER_COLOR_COMPONENT = 8;

export function testMediaQuery(
  mediaQueries: readonly MediaCondition[],
  get: Getter,
): boolean {
  for (const query of mediaQueries) {
    if (!matches(evaluateCondition(query, MEDIA_FEATURES, get))) {
      return false;
    }
  }
  return true;
}

function testComparison(
  mediaQuery: MediaComparison | MediaInterval,
  get: Getter,
): Truth {
  if (mediaQuery[1] === "aspect-ratio") {
    return testAspectRatio(mediaQuery, get(vw), get(vh), get);
  }

  // The runtime measures the window and not the screen
  if (mediaQuery[1] === "device-aspect-ratio") {
    return UNKNOWN;
  }

  if (mediaQuery[0] === "[]") {
    return testMediaFeatureInterval(
      mediaQuery,
      getMediaFeatureValue(mediaQuery[1], get),
      get,
    );
  }

  // Read by index, since Babel compiles a destructured tuple to a helper call that costs more than the comparison
  const operator = mediaQuery[0];
  const name = mediaQuery[1];
  const value = mediaQuery[2];

  switch (name) {
    // dir and platform are this library's conditions rather than media features, so neither has a boolean context
    case "dir":
      return compareMediaFeature(
        operator,
        I18nManager.isRTL ? "rtl" : "ltr",
        value,
        get,
      );
    case "platform":
    case "display-mode":
      return (
        value === "native" ||
        compareMediaFeature(operator, Platform.OS, value, get)
      );
    case "color-gamut":
    case "video-color-gamut":
    case "dynamic-range":
    case "video-dynamic-range":
      return testLowerBound(operator, name, value, get);
    default:
      return compareMediaFeature(
        operator,
        getMediaFeatureValue(name, get),
        value,
        get,
      );
  }
}

type LowerBoundFeature =
  | "color-gamut"
  | "video-color-gamut"
  | "dynamic-range"
  | "video-dynamic-range";

// Every screen shows at least the sRGB gamut at a standard dynamic range, its video too (MQ5 §6.4, §6.5, §8); whether it shows more, React Native does not report
const LEAST_SHOWN = {
  "color-gamut": "srgb",
  "video-color-gamut": "srgb",
  "dynamic-range": "standard",
  "video-dynamic-range": "standard",
} as const satisfies Readonly<Record<LowerBoundFeature, string>>;

// A screen may show more than the least, so a comparison the least does not make true is unknown
function testLowerBound(
  operator: MediaFeatureComparison,
  name: LowerBoundFeature,
  value: MediaFeatureOperand,
  get: Getter,
): Truth {
  return compareMediaFeature(operator, LEAST_SHOWN[name], value, get) === true
    ? true
    : UNKNOWN;
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
    case "aspect-ratio":
      return get(vw) / get(vh);
    // -webkit-device-pixel-ratio is resolution in dppx (https://compat.spec.whatwg.org/#css-media-queries-webkit-device-pixel-ratio)
    case "resolution":
    case "-webkit-device-pixel-ratio":
      return PixelRatio.get();
    case "orientation":
      return get(vh) < get(vw) ? "landscape" : "portrait";
    // A React Native screen scrolls what overflows it
    case "overflow-block":
    case "overflow-inline":
      return "scroll";
    case "color-gamut":
    case "video-color-gamut":
    case "dynamic-range":
    case "video-dynamic-range":
      return LEAST_SHOWN[name];
    // Scanning applies to no React Native screen, as to no screen in any engine; none matches neither of scan's values and is false in a boolean context (MQ5 §2.4.2)
    case "scan":
      return "none";
    // Windows' high contrast mode forces colors, which react-native-windows reports through its own AppTheme rather than React Native's APIs; no other platform has a forced colors mode (MQ5 §12.4)
    case "forced-colors":
      return Platform.OS === "windows" ? undefined : "none";
    default:
      return undefined;
  }
}

const MEDIA_FEATURES: FeatureReader<Getter> = {
  read: getMediaFeatureValue,
  compare: testComparison,
};

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

// MQ5 §7 answers for the primary input, as Safari and Chrome do on a phone or tablet; React Native reports no other input device, so any-pointer and any-hover answer for the primary input too
const PRIMARY_INPUT_FEATURES = {
  touchscreen: { pointer: "coarse", hover: "none" },
  mouse: { pointer: "fine", hover: "hover" },
  remote: { pointer: "none", hover: "none" },
} as const satisfies Readonly<
  Record<PrimaryInput, { readonly pointer: string; readonly hover: string }>
>;
