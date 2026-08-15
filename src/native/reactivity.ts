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

export type ObservableBatch = {
  current?: Set<Effect>;
};

export function observable<Value, Arg = Value>(
  init: Value | Read<Value, Arg>,
  equality: (value1: Value, value2: Value) => boolean = Object.is,
) {
  let value: Value;
  /**
   * The value `observers` have been handed. `value` cannot answer "is a
   * notification still owed?" because `get()` refreshes the cache on read - a
   * read that lands between a write and its notification would move the cache
   * onto the new value, and the guards below would then mistake the pending
   * change for one that has already been delivered. Only `notify()` advances
   * this, so a read can never cancel a notification.
   */
  let notifiedValue: Value;
  let isStatic = typeof init !== "function";
  let didInit: boolean | undefined;
  let lastArg: Arg | undefined;

  if (typeof init !== "function") {
    value = init;
    notifiedValue = init;
    didInit = true;
  }

  const observers = new Set<Effect>();
  const effect: Effect = {
    observers,
    run: () => {
      if (!isStatic) {
        const nextValue = (init as Read<Value, Arg>)(getter, lastArg);
        if (equality(notifiedValue, nextValue)) {
          return;
        }
        value = nextValue;
      }

      notify();
    },
  };

  const getter: Getter = (observable) => observable.get(effect);

  function get(effect?: Effect) {
    // Sampled before subscribing: an observer added by this call receives the
    // value this call returns, so only observers that were already registered
    // can be left behind by the refresh below.
    const hadObservers = observers.size > 0;

    if (effect) {
      observers.add(effect);
    }
    if (!didInit) {
      value = (init as Read<Value, Arg>)(getter, undefined);

      if (!hadObservers) {
        // Nobody was subscribed, so no notification can be owed for this value.
        // Publishing it here keeps the first dependency change from firing a
        // notification for a value the subscriber already read.
        notifiedValue = value;
      }
    }

    return value;
  }

  function set(arg: Arg) {
    let nextValue: Value;

    if (isStatic) {
      nextValue = arg as unknown as Value;
    } else {
      nextValue = (init as Read<Value, Arg>)(getter, arg);

      didInit = true;
      lastArg = arg;
    }

    if (equality(notifiedValue, nextValue)) {
      return;
    }

    value = nextValue;
    notify();

    return obs;
  }

  function notify() {
    notifiedValue = value;

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

export type ContainerContextValue = Record<string, WeakKey>;

/****************************** Process globals *******************************/

/**
 * Everything below this point is process-global reactive state, and every piece
 * of it is duplicated under the dual package hazard: `package.json`'s `exports`
 * map sends `import` to `dist/module/**` and `require` to `dist/commonjs/**`,
 * and Metro resolves per requesting module, so one app can evaluate this module
 * twice. Two copies means two `Dimensions` listeners writing two `vw`s, and a
 * subscriber registered through one copy never hears a write made through the
 * other.
 *
 * It is pinned as ONE object rather than a global per export because the state
 * is mutually coupled - `vw`/`vh` derive from `dimensions`, and the listener
 * that writes them does so through `observableBatch`. A per-export guard lets a
 * later edit share some and not others, which yields a half-shared graph that
 * is harder to diagnose than no guard at all. Building it in one initializer
 * also makes the listener registrations part of what runs exactly once.
 *
 * The pure exports above (`observable`, `family`, `cleanupEffect`, ...) are
 * deliberately NOT pinned: they close over no process state, so a second copy
 * of them is harmless. `VAR_SYMBOL` is interned by `Symbol.for` and is already
 * shared by construction.
 */
function createReactivityState() {
  const dimensions = observable(Dimensions.get("window"));
  const vw = observable<number>(
    (read, value) => value ?? read(dimensions)?.width,
  );
  const vh = observable<number>(
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

  const colorScheme = observable<ColorSchemeName>(Appearance.getColorScheme());
  Appearance.addChangeListener((event) => colorScheme.set(event.colorScheme));

  const containerLayoutFamily = weakFamily(() => {
    return observable<LayoutRectangle>({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });

  return {
    observableBatch: {} as ObservableBatch,

    hoverFamily: weakFamily(() => observable(false)),
    activeFamily: weakFamily(() => observable<boolean>(false)),
    focusFamily: weakFamily(() => observable<boolean>(false)),

    dimensions,
    vw,
    vh,
    colorScheme,

    ContainerContext: createContext<ContainerContextValue>({}),
    containerLayoutFamily,
    containerWidthFamily: weakFamily((key: WeakKey) => {
      return observable((read) => {
        return read(containerLayoutFamily(key))?.width || 0;
      });
    }),
    containerHeightFamily: weakFamily((key: WeakKey) => {
      return observable((read) => {
        return read(containerLayoutFamily(key))?.width || 0;
      });
    }),
  };
}

declare global {
  var __react_native_css_reactivity:
    | ReturnType<typeof createReactivityState>
    | undefined;
}

globalThis.__react_native_css_reactivity ??= createReactivityState();

export const {
  observableBatch,
  hoverFamily,
  activeFamily,
  focusFamily,
  dimensions,
  vw,
  vh,
  colorScheme,
  ContainerContext,
  containerLayoutFamily,
  containerWidthFamily,
  containerHeightFamily,
} = globalThis.__react_native_css_reactivity;
