import { I18nManager, PixelRatio, Platform } from "react-native";

import type { MediaCondition } from "react-native-css/compiler";

import {
  colorScheme,
  hoverCapableInput,
  vh,
  vw,
  type Getter,
} from "../reactivity";
import {
  compareMediaFeature,
  evaluateCondition,
  type MeasuredFeatureValue,
  type MediaComparison,
  type MediaFeatureName,
} from "./compare";
import { disjoin, matches, type Truth } from "./kleene";

// The color feature counts bits per color component
const BITS_PER_COLOR_COMPONENT = 8;

export function testMediaQuery(mediaQueries: MediaCondition[], get: Getter) {
  return mediaQueries.every((query) => matches(test(query, get)));
}

function test(mediaQuery: MediaCondition, get: Getter): Truth {
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
    // any-pointer matches when any pointer the device has matches, where pointer answers for the primary one (MQ5 §7.3)
    case "any-pointer":
      return disjoin(availablePointers(get), (pointer) =>
        compareMediaFeature(operator, pointer, value),
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
      return pointerAccuracy(get) === "fine" ? "hover" : "none";
    case "pointer":
    case "any-pointer":
      return pointerAccuracy(get);
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

// A touchscreen cannot hover and points coarsely until a pointer hovers an element with a :hover style, which React Native reports on iOS and Android only with its shouldPressibilityUseW3CPointerEventsForHover flag on (MQ5 §7.1, §7.2)
function pointerAccuracy(get: Getter): "none" | "coarse" | "fine" {
  const input = primaryInput();

  switch (input) {
    case "remote":
      return "none";
    case "mouse":
      return "fine";
    case "touchscreen":
      return get(hoverCapableInput) ? "fine" : "coarse";
    default:
      input satisfies never;
      return "none";
  }
}

function availablePointers(get: Getter): readonly string[] {
  const input = primaryInput();

  switch (input) {
    case "remote":
      return ["none"];
    case "mouse":
      return ["fine"];
    case "touchscreen":
      return get(hoverCapableInput) ? ["coarse", "fine"] : ["coarse"];
    default:
      input satisfies never;
      return ["none"];
  }
}
