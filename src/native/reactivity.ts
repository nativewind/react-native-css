/* eslint-disable */
import { createContext } from "react";
import {
  Appearance,
  Dimensions,
  type ColorSchemeName,
  type LayoutRectangle,
} from "react-native";

import type { StyleDescriptor } from "react-native-css/compiler";

export type Effect = {
  observers: Set<Effect>;
  run(): void;
};

export type Observable<Value, Arg = Value> = {
  observers: Set<Effect>;
  get: (effect?: Effect) => Value;
  set: (arg: Arg) => void;
  run: () => void;
};
type Read<Value, Arg> = (get: Getter, arg?: Arg) => Value;
export type Getter = <Value>(observable: Observable<Value, any>) => Value;

export const observableBatch: {
  current?: Set<Effect>;
} = {};

export function observable<Value, Arg = Value>(
  init: Value | Read<Value, Arg>,
  equality: (value1: Value, value2: Value) => boolean = Object.is,
) {
  let value: Value;
  let isStatic = typeof init !== "function";
  let didInit: boolean | undefined;
  let lastArg: Arg | undefined;

  if (typeof init !== "function") {
    value = init;
    didInit = true;
  }

  const observers = new Set<Effect>();
  const effect: Effect = {
    observers,
    run: () => {
      if (!isStatic) {
        const nextValue = (init as Read<Value, Arg>)(getter, lastArg);
        if (equality(value, nextValue)) {
          return;
        }
        value = nextValue;
      }

      notify();
    },
  };

  const getter: Getter = (observable) => observable.get(effect);

  function get(effect?: Effect) {
    if (effect) {
      observers.add(effect);
    }
    if (!didInit) {
      value = (init as Read<Value, Arg>)(getter, undefined);
    }

    return value;
  }

  function set(arg: Arg) {
    if (isStatic) {
      if (equality(value, arg as unknown as Value)) {
        return;
      }
      value = arg as unknown as Value;
    } else {
      const nextValue = (init as Read<Value, Arg>)(getter, arg);

      didInit = true;
      lastArg = arg;

      if (equality(value, nextValue)) {
        return;
      }
      value = nextValue;
    }

    notify();

    return obs;
  }

  function notify() {
    Array.from(observers).forEach((observer) => {
      if (observableBatch.current) {
        observableBatch.current.add(observer);
      } else {
        observer.run();
      }
    });
  }

  const obs: Observable<Value, Arg> = {
    observers,
    get,
    set,
    run: effect.run,
  };

  return obs;
}

export function cleanupEffect(effect: Effect) {
  if (!effect) return;
  for (const dep of effect.observers) {
    dep.observers.delete(effect);
  }
  effect.observers.clear();
}

/** Family Helpers ************************************************************/

export function family<Key, Result = Key, Args extends any = void>(
  fn: (key: Key, args: Args) => Result,
) {
  const map = new Map<Key, Result>();
  return Object.assign(
    (key: Key, args: Args) => {
      let value = map.get(key);
      if (!value) {
        value = fn(key, args);
        map.set(key, value);
      }
      return value;
    },
    {
      delete(key: Key) {
        return map.delete(key);
      },
      clear() {
        return map.clear();
      },
    },
  );
}

type WeakFamilyFn<Key, Args = undefined, Result = Key> = ((
  key: Key,
  args: Args,
) => Result) & {
  has(key: Key): boolean;
};

export function weakFamily<Key extends WeakKey, Result = Key>(
  fn: (key: Key) => Result,
): WeakFamilyFn<Key, void, Result>;
export function weakFamily<Key extends WeakKey, Args = undefined, Result = Key>(
  fn: (key: Key, args: Args) => Result,
): WeakFamilyFn<Key, Args, Result>;
export function weakFamily<Key extends WeakKey, Args = undefined, Result = Key>(
  fn: (key: Key, args: Args) => Result,
): WeakFamilyFn<Key, Args, Result> {
  const map = new WeakMap<Key, Result>();
  return Object.assign(
    (key: Key, args: Args) => {
      let value = map.get(key);
      if (!value) {
        value = fn(key, args);
        map.set(key, value);
      }
      return value;
    },
    {
      has: (key: Key) => map.has(key),
    },
  );
}

/********************************* Variables **********************************/

export const VAR_SYMBOL = Symbol.for("react-native-css.var");
export type VariableContextValue = Record<string, StyleDescriptor> & {
  [VAR_SYMBOL]: true;
};

/** Pseudo Classes ************************************************************/

export const hoverFamily = weakFamily(() => observable(false));
export const activeFamily = weakFamily(() => observable<boolean>(false));
export const focusFamily = weakFamily(() => observable<boolean>(false));

/** Dimensions ****************************************************************/

export const dimensions = observable(Dimensions.get("window"));
export const vw = observable<number>(
  (read, value) => value ?? read(dimensions)?.width,
);
export const vh = observable<number>(
  (read, value) => value ?? read(dimensions)?.height,
);

Dimensions.addEventListener("change", ({ window }) => {
  observableBatch.current = new Set();
  vw.set(window.width);
  vh.set(window.height);

  for (const effect of observableBatch.current) {
    effect.run();
  }

  observableBatch.current = undefined;
});

/** Color Scheme **************************************************************/

export const colorScheme = observable<ColorSchemeName>(
  Appearance.getColorScheme(),
);
Appearance.addChangeListener((event) => colorScheme.set(event.colorScheme));

/**
 * What a reader renders, from whatever the scheme channel is holding.
 *
 * Totalized over the scheme UNION rather than over nullishness, and that is the
 * whole of it. `"unspecified"` is react-native 0.82's spelling of "follow the
 * system" — the request 0.81 spells `null` — so it is a REQUEST, never a scheme.
 * A `?? Appearance.getColorScheme() ?? "light"` chain only fires on nullish, so
 * the literal passes straight through, and a reader handed it matches neither
 * `prefers-color-scheme: dark` nor `: light`: every scheme-conditional class
 * goes dead rather than falling back. On Android nothing repairs that until the
 * user toggles the system theme, because `AppearanceModule` emits only when the
 * RESOLVED scheme changes.
 *
 * It accepts a resolved scheme and rejects everything else, rather than naming
 * the members it must reject. That is what makes it total: a future release can
 * add another "no scheme yet" spelling and this keeps answering correctly,
 * where a deny-list would silently gain a third hole. It is also why nothing
 * here compares against `"unspecified"`, which is outside the `ColorSchemeName`
 * the installed react-native declares.
 *
 * One function rather than the expression written at each reader, because both
 * readers have to give the SAME answer — the class layer and the prop layer
 * disagreeing about the scheme is the defect, not the duplication. The two
 * copies this replaces had already drifted into being wrong together.
 *
 * `"light"` is the last resort, per MQ5 §5.4.
 */
export function resolveColorScheme(held: ColorSchemeName): "light" | "dark" {
  if (held === "light" || held === "dark") {
    return held;
  }
  const reported = Appearance.getColorScheme();
  return reported === "light" || reported === "dark" ? reported : "light";
}

/** Containers ****************************************************************/

export type ContainerContextValue = Record<string, WeakKey>;
export const ContainerContext = createContext<ContainerContextValue>({});

export const containerLayoutFamily = weakFamily(() => {
  return observable<LayoutRectangle>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
});

export const containerWidthFamily = weakFamily((key) => {
  return observable((read) => {
    return read(containerLayoutFamily(key))?.width || 0;
  });
});

export const containerHeightFamily = weakFamily((key) => {
  return observable((read) => {
    return read(containerLayoutFamily(key))?.width || 0;
  });
});
