/* eslint-disable */
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";

import {
  activeFamily,
  containerActiveFamily,
  containerLayoutFamily,
  focusFamily,
  hoverFamily,
  type Getter as WeakKey,
} from "../reactivity";

const mainCache = new WeakMap<
  WeakKey,
  Map<InteractionType, WeakMap<Function, (event: any) => void>>
>();

/** The touches each container follows: those that went down inside it and are still on screen. */
const containerTouches = new WeakMap<WeakKey, ReadonlySet<string>>();

/**
 * A container is `:active` until the last touch that went down inside it ends. A touch whose
 * end never reached it — its target left the screen first — is dropped at the next touch event,
 * because it is no longer among the touches on screen.
 */
function followContainerTouches(
  weakKey: WeakKey,
  event: GestureResponderEvent,
  phase: "down" | "up",
) {
  const onScreen = new Set(
    event.nativeEvent.touches.map((touch) => touch.identifier),
  );
  const following = new Set(
    [...(containerTouches.get(weakKey) ?? [])].filter((identifier) =>
      onScreen.has(identifier),
    ),
  );
  for (const touch of event.nativeEvent.changedTouches) {
    if (phase === "down") {
      following.add(touch.identifier);
    } else {
      following.delete(touch.identifier);
    }
  }
  containerTouches.set(weakKey, following);
  containerActiveFamily(weakKey).set(following.size > 0);
}

type Handler = (event: unknown) => void;

export type InteractionType =
  | "onLayout"
  | "onHoverIn"
  | "onHoverOut"
  | "onPress"
  | "onPressIn"
  | "onPressOut"
  | "onTouchStart"
  | "onTouchEnd"
  | "onTouchCancel"
  | "onFocus"
  | "onBlur";

const defaultHandlers: Record<InteractionType, Handler> = {
  onLayout: () => {},
  onHoverIn: () => {},
  onHoverOut: () => {},
  onPress: () => {},
  onPressIn: () => {},
  onPressOut: () => {},
  onTouchStart: () => {},
  onTouchEnd: () => {},
  onTouchCancel: () => {},
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
          containerActiveFamily(weakKey).set(true);
          break;
        case "onPressOut":
          activeFamily(weakKey).set(false);
          containerActiveFamily(weakKey).set(false);
          break;
        case "onTouchStart":
          followContainerTouches(
            weakKey,
            event as GestureResponderEvent,
            "down",
          );
          break;
        case "onTouchEnd":
        case "onTouchCancel":
          followContainerTouches(weakKey, event as GestureResponderEvent, "up");
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
