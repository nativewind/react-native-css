/* eslint-disable */
import type { LayoutChangeEvent } from "react-native";

import {
  activeFamily,
  containerLayoutFamily,
  focusFamily,
  hoverFamily,
  type Getter as WeakKey,
} from "../reactivity";

const mainCache = new WeakMap<
  WeakKey,
  Map<InteractionType, WeakMap<Function, (event: any) => void>>
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
  weakKey: WeakKey,
  type: InteractionType,
  handler?: Handler | null,
) {
  handler ??= defaultHandlers[type];
  let interactions = mainCache.get(weakKey);
  if (!interactions) {
    interactions = new Map();
    mainCache.set(weakKey, interactions);
  }

  // A caller may reuse one callback for events that update opposite states.
  let cache = interactions.get(type);
  if (!cache) interactions.set(type, (cache = new WeakMap()));

  let cached = cache.get(handler);
  if (!cached) {
    cached = (event: any) => {
      if (handler) {
        handler(event);
      }

      switch (type) {
        case "onLayout":
          containerLayoutFamily(weakKey).set(
            (event as LayoutChangeEvent).nativeEvent.layout,
          );
          break;
        case "onHoverIn":
          hoverFamily(weakKey).set(true);
          break;
        case "onHoverOut":
          hoverFamily(weakKey).set(false);
          break;
        case "onPress":
          break;
        case "onPressIn":
          activeFamily(weakKey).set(true);
          break;
        case "onPressOut":
          activeFamily(weakKey).set(false);
          break;
        case "onFocus":
          focusFamily(weakKey).set(true);
          break;
        case "onBlur":
          focusFamily(weakKey).set(false);
          break;
      }
    };
    cache.set(handler, cached);
  }

  return cached;
}
