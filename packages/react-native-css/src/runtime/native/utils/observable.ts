/********************************    Effect   *********************************/
/**
 * An effect can be used to subscribe to an observable.
 * When the observable changes, the effect will run.
 */
export type Effect = {
  dependencies: Set<Observable<any, any[]>>;
  run(): void;
  get<Value, Args extends unknown[]>(
    readable: Observable<Value, Args> | Mutable<Value, Args>,
  ): Value;
};

export function cleanupEffect(effect?: Effect) {
  if (!effect) return;
  for (const dep of effect.dependencies) {
    dep.remove(effect);
  }
  effect.dependencies.clear();
}

/******************************    Observable   *******************************/

/**
 * An observable is a value that when read by an effect, will subscribe
 * the effect to the observable.
 */
export type Observable<Value = unknown, Args extends unknown[] = never[]> = {
  // Get the current value of the observable. If you provide an Effect, it will be subscribed to the observable.
  get(effect?: Effect): Value;
  // Set the value and rerun all subscribed Effects
  set(...value: Args): void;
  // Remove the effect from the observable
  remove(effect: Effect): void;
  // Set, but add the effects to a batch to be run later
  batch(batch?: Set<Effect>, ...value: Args): void;

  onChange(observable: Observable<any, any>): void;
  recalculate(set: Set<Effect>): void;

  name?: string;
};

type Read<Value> = (get: Getter) => Value;
type Write<Value, Args extends unknown[]> = (
  utils: { set: Setter; get: Getter },
  ...args: Args
) => Value;
type MutableWrite<Value, Args extends unknown[]> = (
  _: void,
  ...args: Args
) => Value;
type Equality<Value> = ((left: Value, right: Value) => Boolean) | boolean;
type Getter = <Value, Args extends unknown[]>(
  observable: Observable<Value, Args>,
) => Value;
type Setter = <Value, Args extends unknown[]>(
  observable: Observable<Value, Args>,
  ...args: Args
) => void;

export function observable<Value>(
  read: undefined,
  write: undefined,
  equality?: Equality<Value>,
): Observable<Value | undefined, [Value]>;
export function observable<Value, Args extends unknown[]>(
  read: undefined,
  write?: Write<Value, Args>,
  equality?: Equality<Value>,
): Observable<Value | undefined, Args>;
export function observable<Value, Args extends unknown[]>(
  read: Value | Read<Value>,
  write: Write<Value, Args>,
  equality?: Equality<Value>,
): Observable<Value, Args>;
export function observable<Value>(
  read: Value | Read<Value>,
): Observable<Value, [Value]>;
export function observable<Value>(): Observable<
  Value | undefined,
  [Value | undefined]
>;
export function observable<Value, Args extends unknown[]>(
  read?: Value | Read<Value>,
  write?: Write<Value, Args>,
  equality: Equality<Value> = Object.is,
): Observable<Value, Args> {
  const dependentEffects = new Set<Effect>();
  const dependentObs = new Set<Observable>();

  let init: Value | Read<Value> | undefined | null = null;
  let value: Value | undefined;

  const getter: Getter = (observable) => {
    observable.onChange(obs);
    return observable.get();
  };

  const setter: Setter = (observable, ...args) => {
    observable.onChange(obs);
    observable.set(...args);
  };

  const utils = { get: getter, set: setter };

  const obs: Observable<Value, Args> = {
    get(dependent) {
      /**
       * Observables with read functions are lazy and only run the read function once.
       */
      if (init === null) {
        value =
          typeof read === "function" ? (read as Read<Value>)(getter) : read;
        init = value;
      }

      /**
       * Subscribe the effect to the observable if it is not read-only.
       */
      if (dependent) {
        dependentEffects.add(dependent);
        dependent.dependencies.add(obs);
      }

      return value as Value;
    },
    /**
     * Sets the value of the observable and immediately runs all subscribed effects.
     * If you are setting multiple observables in succession, use batch() instead.
     */
    set(...args) {
      const nextValue =
        typeof write === "function"
          ? write(utils, ...(args as Args))
          : (args[0] as Value);

      const isEqual =
        typeof equality === "function"
          ? equality(value as Value, nextValue)
          : equality;

      if (isEqual) {
        return;
      }

      value = nextValue;
      init = value;

      const effects = new Set(dependentEffects);
      const dependentObsArray = Array.from(dependentObs);
      dependentObs.clear();

      for (const observable of dependentObsArray) {
        observable.recalculate(effects);
      }

      for (const effect of effects) {
        effect.run();
      }
    },
    remove(effect) {
      dependentEffects.delete(effect);
    },
    /**
     * batch() accepts a Set<Effect> and instead of running the effects immediately,
     * it will add them to the Set.
     *
     * It it up to the caller to run the effects in the Set.
     */
    batch(batch, ...args) {
      const nextValue =
        typeof write === "function"
          ? write(utils, ...(args as Args))
          : (args[0] as Value);

      const isEqual =
        typeof equality === "function"
          ? equality(value as Value, nextValue)
          : equality;

      if (isEqual) {
        return;
      }

      // If the observable has not been initialized, we can just set the value
      if (!init) {
        read = nextValue;
        return;
      }

      value = nextValue;

      for (const effect of dependentEffects) {
        batch?.add(effect);
      }
    },

    onChange(observable) {
      dependentObs.add(observable);
    },

    recalculate(set) {
      if (typeof read !== "function") {
        return;
      }

      const nextValue = (read as Read<Value>)(getter);

      const isEqual =
        typeof equality === "function"
          ? equality(value as Value, nextValue)
          : equality;

      if (isEqual) {
        return;
      }

      value = nextValue;

      const dependentObsArray = Array.from(dependentObs);
      dependentObs.clear();

      for (const observable of dependentObsArray) {
        observable.recalculate(set);
      }

      for (const effect of dependentEffects) {
        set.add(effect);
      }
    },
  };

  return obs;
}

/********************************    Mutable   ********************************/

/**
 * An "observable" that does not observe anything.
 *
 * This is used in production for things that cannot change.
 */
export type Mutable<Value, Args extends unknown[]> = Observable<Value, Args>;

export function mutable<Value>(
  read: undefined,
  write: undefined,
  equality?: Equality<Value>,
): Mutable<Value | undefined, never[]>;
export function mutable<Value>(): Mutable<Value | undefined, never[]>;
export function mutable<Value, Args extends unknown[]>(
  value: undefined,
  write?: MutableWrite<Value, Args>,
  equality?: Equality<Value>,
): Mutable<Value | undefined, Args>;
export function mutable<Value, Args extends unknown[]>(
  value?: Value,
  write?: MutableWrite<Value, Args>,
  equality: Equality<Value> = Object.is,
): Mutable<Value, Args> {
  return {
    get() {
      return value as Value;
    },
    set(...args) {
      const nextValue =
        typeof write === "function"
          ? write(undefined, ...(args as Args))
          : (args[0] as Value);

      const isEqual =
        typeof equality === "function"
          ? equality(value as Value, nextValue)
          : equality;

      if (!isEqual) {
        value = nextValue;
      }
    },
    batch(_, ...args) {
      return this.set(...args);
    },
    remove() {},
    onChange() {},
    recalculate() {},
  };
}

/********************************    Family    ********************************/

export type Family<Value, Args extends unknown[] = never[]> = ReturnType<
  typeof family<Value, Args>
>;

/**
 * Utility around Map that creates a new value if it doesn't exist.
 */
export function family<Value, Args extends unknown[]>(
  fn: (name: string, ...args: Args) => Value,
) {
  const map = new Map<string, Value>();
  return Object.assign(
    (name: string, ...args: Args) => {
      let result = map.get(name);
      if (!result) {
        result = fn(name, ...args);
        map.set(name, result);
      }
      return result!;
    },
    {
      clear() {
        map.clear();
      },
    },
  );
}

/**
 * Utility around WeakMap that creates a new value if it doesn't exist.
 */
export function weakFamily<Key extends WeakKey, Result>(
  fn: (key: Key) => Result,
) {
  const map = new WeakMap<Key, Result>();
  return Object.assign(
    (key: Key) => {
      let value = map.get(key);
      if (!value) {
        value = fn(key);
        map.set(key, value);
      }
      return value;
    },
    {
      has(key: Key) {
        return map.has(key);
      },
    },
  );
}
