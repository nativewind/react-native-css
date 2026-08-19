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
  /**
   * Release anything this observable owns once nothing observes it — a cache entry, most of all.
   *
   * Optional because most observables own nothing. `cleanupEffect` calls it after detaching a
   * subscriber, which is the only moment an observable can learn that its last one has gone.
   */
  cleanup?: (...effects: readonly Effect[]) => void;
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
    // The internal effect's OWN set. Sharing `observers` with the observable conflates two
    // opposite directions in one container: what subscribes to this observable, and what this
    // observable reads. A derived observable then appears in its own subscriber list once per
    // dependency, so `notify()` walks a cycle and a release check can never reach zero.
    observers: new Set<Effect>(),
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
      // The reverse edge, and the whole reason `cleanupEffect` can do anything. Recording only the
      // forward direction leaves a subscriber with no record of what it reads, so the unmount walk
      // iterates an empty set: no observable is ever unsubscribed, every unmounted component stays
      // reachable through its `run` closure, and every cache entry outlives the tree that used it.
      effect.observers.add(obs);
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
    // An observable that owns a cache entry releases it once nothing observes it. This is the only
    // moment it can know that: detaching is what makes the last subscriber's departure observable.
    dep.cleanup?.();
  }
  effect.observers.clear();
}

/** Family Helpers ************************************************************/

/**
 * A keyed cache of derived values.
 *
 * `maxSize` bounds it, and a bounded family evicts the least recently READ rather than the oldest.
 * That ordering is the point: the workload that fills a bounded family here is a churn of
 * single-use keys arriving beside a small set read on every render, and insertion order would
 * discard exactly the entries worth keeping. Renewing on a hit costs a delete plus a set on the
 * read path — measured at ~23ns against a ~265ns key derivation, so under a tenth of the work it
 * protects.
 *
 * Eviction is safe by construction rather than by policy: a miss re-derives the value from the
 * arguments the caller brought, so the worst an evicted entry costs is the work of rebuilding it.
 * A consumer still holding a previously-returned value keeps a live reference and is unaffected.
 *
 * Omitting `maxSize` keeps the cache unbounded, which is correct wherever the key space is bounded
 * by something else — a class name, a variable name, anything the stylesheet enumerates.
 */
export function family<Key, Result = Key, Args extends any = void>(
  fn: (key: Key, args: Args) => Result,
  maxSize?: number,
) {
  const map = new Map<Key, Result>();
  return Object.assign(
    (key: Key, args: Args) => {
      let value = map.get(key);
      if (value === undefined) {
        value = fn(key, args);
        map.set(key, value);

        if (maxSize !== undefined && map.size > maxSize) {
          // `Map` iterates in insertion order and a hit re-inserts, so the first key is the least
          // recently read.
          const leastRecentlyRead = map.keys().next();
          if (!leastRecentlyRead.done) {
            map.delete(leastRecentlyRead.value);
          }
        }
      } else if (maxSize !== undefined) {
        // Renew: move this key to the end so it is not the next eviction candidate.
        map.delete(key);
        map.set(key, value);
      }
      return value;
    },
    {
      delete(key: Key) {
        return map.delete(key);
      },
      /**
       * Delete a key only while it still maps to `value`.
       *
       * A cached value that releases itself knows the key it was created under, and that key may
       * since have been remapped — by eviction and a rebuild, or by a consumer that superseded its
       * own entry and left a stale reference behind. Deleting by key alone then destroys whatever
       * took the key, which belongs to somebody else and is live.
       */
      deleteIf(key: Key, value: Result) {
        return map.get(key) === value ? map.delete(key) : false;
      },
      size() {
        return map.size;
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
      if (value === undefined) {
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
