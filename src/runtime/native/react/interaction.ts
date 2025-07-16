/* eslint-disable */
import type { LayoutChangeEvent } from "react-native";

import {
  activeFamily,
  containerLayoutFamily,
  focusFamily,
  hoverFamily,
  type Effect,
} from "../reactivity";

const mainCache = new WeakMap<
  Effect,
  WeakMap<Function, (event: any) => void>
>();

type Handler = (event: unknown) => void;

export type InteractionType =
  | "onLayout"
  | "onHoverIn"
  | "onHoverOut"
  | "onPress"
  | "onPressIn"
  | "onPressOut"
  | "onFocus"
  | "onBlur";

const defaultHandlers: Record<InteractionType, Handler> = {
  onLayout: () => {},
  onHoverIn: () => {},
  onHoverOut: () => {},
  onPress: () => {},
  onPressIn: () => {},
  onPressOut: () => {},
  onFocus: () => {},
  onBlur: () => {},
};

export function getInteractionHandler(
  effect: Effect,
  type: InteractionType,
  handler = defaultHandlers[type],
) {
  let cache = mainCache.get(effect);
  if (!cache) {
    cache = new WeakMap();
    mainCache.set(effect, cache);
  }

  let cached = cache.get(handler);
  if (!cached) {
    cached = (event: any) => {
      if (handler) {
        handler(event);
      }

      switch (type) {
        case "onLayout":
          containerLayoutFamily(effect).set(
            (event as LayoutChangeEvent).nativeEvent.layout,
          );
          break;
        case "onHoverIn":
          hoverFamily(effect).set(true);
          break;
        case "onHoverOut":
          hoverFamily(effect).set(false);
          break;
        case "onPress":
          break;
        case "onPressIn":
          activeFamily(effect).set(true);
          break;
        case "onPressOut":
          activeFamily(effect).set(false);
          break;
        case "onFocus":
          focusFamily(effect).set(true);
          break;
        case "onBlur":
          focusFamily(effect).set(false);
          break;
      }
    };
    cache.set(handler, cached);
  }

  return cached;
}
