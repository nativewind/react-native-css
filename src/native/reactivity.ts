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
  observers: Set<Observable<any, any>>;
  run(): void;
};

export type Observable<Value, Arg = Value> = {
  observers: Set<Effect>;
  /** Advances each time the value changes, so a read can be checked later without subscribing */
  readonly version: number;
  get: (effect?: Effect) => Value;
  set: (arg: Arg) => void;
  run: () => void;
  unsubscribe: (effect: Effect) => void;
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
  const isStatic = typeof init !== "function";
  let value = (isStatic ? init : undefined) as Value;
  let version = 0;
  let lastArg: Arg | undefined;
  /** What a computed value was last computed from, each source beside its version then */
  let sources: Map<Observable<any, any>, number> | undefined;

  const observers = new Set<Effect>();
  const effect: Effect = {
    observers: new Set(),
    run: () => {
      if (isStatic || compute(lastArg)) {
        notify();
      }
    },
  };

  const getter: Getter = (source) => {
    const sourceValue = source.get(observers.size > 0 ? effect : undefined);
    sources?.set(source, source.version);
    return sourceValue;
  };

  /** Computes the value, answering whether it changed. Subscribes to the sources only while observed. */
  function compute(arg: Arg | undefined) {
    cleanupEffect(effect);
    const isFirstComputation = sources === undefined;
    sources = new Map();
    let nextValue: Value;
    try {
      nextValue = (init as Read<Value, Arg>)(getter, arg);
    } catch (error) {
      // A computation that threw produced no value, so the next read computes again rather than trusting a partial read
      sources = undefined;
      throw error;
    }
    if (!isFirstComputation && equality(value, nextValue)) {
      return false;
    }
    value = nextValue;
    version++;
    return true;
  }

  /** The sources of a value that is still current, bringing each computed source up to date first */
  function currentSources() {
    if (sources === undefined) {
      return undefined;
    }
    for (const [source, seenVersion] of sources) {
      source.get();
      if (source.version !== seenVersion) {
        return undefined;
      }
    }
    return sources;
  }

  function subscribe(subscriber: Effect) {
    observers.add(subscriber);
    subscriber.observers.add(obs);
  }

  function get(subscriber?: Effect) {
    if (isStatic) {
      if (subscriber) subscribe(subscriber);
      return value;
    }

    // While observed, a computed value is kept current by its sources
    const isObserved = observers.size > 0;
    if (subscriber) subscribe(subscriber);
    if (!isObserved) {
      const current = currentSources();
      if (current === undefined) {
        compute(lastArg);
      } else if (observers.size > 0) {
        for (const source of current.keys()) {
          source.get(effect);
        }
      }
    }

    return value;
  }

  function set(arg: Arg) {
    if (isStatic) {
      if (equality(value, arg as unknown as Value)) {
        return;
      }
      value = arg as unknown as Value;
      version++;
    } else {
      lastArg = arg;
      if (!compute(arg)) {
        return;
      }
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
    get version() {
      return version;
    },
    get,
    set,
    run: effect.run,
    unsubscribe(subscriber) {
      if (observers.delete(subscriber) && observers.size === 0 && !isStatic) {
        cleanupEffect(effect);
      }
      subscriber.observers.delete(obs);
    },
  };

  return obs;
}

export function cleanupEffect(effect: Effect) {
  if (!effect) return;
  const dependencies = Array.from(effect.observers);
  effect.observers.clear();
  for (const dep of dependencies) {
    dep.unsubscribe(effect);
  }
}

/** What a render read, each observable beside its version when read */
export type RenderReads = readonly (readonly [
  observable: Observable<any, any>,
  version: number,
])[];

/** A getter that subscribes nothing and records each read, for a render React may still discard */
export function recordReads(): { read: Getter; reads: RenderReads } {
  const reads: (readonly [Observable<any, any>, number])[] = [];
  return {
    read: (observable) => {
      const value = observable.get();
      reads.push([observable, observable.version]);
      return value;
    },
    reads,
  };
}

/** Whether two passes read the same observables, whatever their versions */
export function readSameObservables(left: RenderReads, right: RenderReads) {
  const leftObservables = new Set(left.map(([observable]) => observable));
  const rightObservables = new Set(right.map(([observable]) => observable));
  if (leftObservables.size !== rightObservables.size) {
    return false;
  }
  for (const observable of leftObservables) {
    if (!rightObservables.has(observable)) {
      return false;
    }
  }
  return true;
}

/** Make `effect` observe exactly what a committed render read, answering whether any of it moved since */
export function observeReads(
  effect: Effect,
  reads: RenderReads,
): "moved" | "unmoved" {
  const read = new Set<Observable<any, any>>();
  let moved = false;
  for (const [observable, version] of reads) {
    read.add(observable);
    observable.get(effect);
    if (observable.version !== version) {
      moved = true;
    }
  }
  for (const observable of Array.from(effect.observers)) {
    if (!read.has(observable)) {
      observable.unsubscribe(effect);
    }
  }
  return moved ? "moved" : "unmoved";
}

/** Family Helpers ************************************************************/

export function family<Key, Result = Key, Args extends any = void>(
  fn: (key: Key, args: Args) => Result,
) {
  const map = new Map<Key, Result>();
  return Object.assign(
    (key: Key, args: Args) => {
      if (map.has(key)) return map.get(key)!;
      const value = fn(key, args);
      map.set(key, value);
      return value;
    },
    {
      delete(key: Key) {
        return map.delete(key);
      },
      getOrInsert(key: Key, value: Result) {
        if (!map.has(key)) {
          map.set(key, value);
        }
        return map.get(key) as Result;
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
      if (map.has(key)) return map.get(key)!;
      const value = fn(key, args);
      map.set(key, value);
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

export const colorScheme = observable<ColorSchemeName | null | undefined>(
  Appearance.getColorScheme(),
);
Appearance.addChangeListener((event) => colorScheme.set(event.colorScheme));

/** Containers ****************************************************************/

export type ContainerContextValue = Record<
  string,
  {
    key: WeakKey;
    props: Record<string, unknown> | null | undefined;
  }
>;
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
    return read(containerLayoutFamily(key))?.height || 0;
  });
});
