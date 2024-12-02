/********************************    Effect   *********************************/
/**
 * An effect can be used to subscribe to an observable.
 * When the observable changes, the effect will run.
 */
export type Effect = {
  dependencies: Set<Observable<any, any>>;
  run(): void;
  get<Value, Arg>(readable: Observable<Value, Arg>): Value;
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
export type Observable<Value = unknown, Arg = never> = {
  // Get the current value of the observable. If you provide an Effect, it will be subscribed to the observable.
  get(effect?: Effect): Value;
  // Set the value and rerun all subscribed Effects
  set(value: Arg): void;
  // Remove the effect from the observable
  remove(effect: Effect): void;
  // Set, but add the effects to a batch to be run later
  batch(batch: Set<Effect> | undefined, value: Arg): void;

  onChange(observable: Observable<any, any>): void;
  recalculate(set: Set<Effect>): void;

  name?: string;
};

type Read<Value> = (get: Getter) => Value;
type Write<Value, Arg> = (
  utils: { set: Setter; get: Getter },
  arg: Arg,
) => Value;
type MutableWrite<Value, Arg> = (_: void, arg: Arg) => Value;
type Equality<Value> = ((left: Value, right: Value) => Boolean) | boolean;
type Getter = <Value, Arg>(observable: Observable<Value, Arg>) => Value;
type Setter = <Value, Arg>(
  observable: Observable<Value, Arg>,
  arg: Arg,
) => void;

export function observable<Value>(
  read: undefined,
  write: undefined,
  equality?: Equality<Value>,
): Observable<Value | undefined, Value>;
export function observable<Value, Arg>(
  read: undefined,
  write?: Write<Value, Arg>,
  equality?: Equality<Value>,
): Observable<Value | undefined, Arg>;
export function observable<Value, Arg>(
  read: Value | Read<Value>,
  write: Write<Value, Arg>,
  equality?: Equality<Value>,
): Observable<Value, Arg>;
export function observable<Value>(
  read: Value | Read<Value>,
): Observable<Value, Value>;
export function observable<Value>(): Observable<
  Value | undefined,
  Value | undefined
>;
export function observable<Value, Arg>(
  read?: Value | Read<Value>,
  write?: Write<Value, Arg>,
  equality: Equality<Value> = Object.is,
): Observable<Value, Arg> {
  const dependentEffects = new Set<Effect>();
  const dependentObs = new Set<Observable>();

  let init: Value | Read<Value> | undefined | null = null;
  let value: Value | undefined;

  const getter: Getter = (observable) => {
    observable.onChange(obs);
    return observable.get();
  };

  const setter: Setter = (observable, arg) => {
    observable.onChange(obs);
    observable.set(arg);
  };

  const utils = { get: getter, set: setter };

  const obs: Observable<Value, Arg> = {
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
    set(arg) {
      const nextValue =
        typeof write === "function"
          ? write(utils, arg)
          : (arg as unknown as Value);

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
    batch(batch, arg) {
      const nextValue =
        typeof write === "function"
          ? write(utils, arg)
          : (arg as unknown as Value);

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

/********************************    Family    ********************************/

export type Family<Value, Arg = never[]> = ReturnType<
  typeof family<Value, Arg>
>;

/**
 * Utility around Map that creates a new value if it doesn't exist.
 */
export function family<Value, Arg>(fn: (name: string, arg?: Arg) => Value) {
  const map = new Map<string, Value>();
  return Object.assign(
    (name: string, arg?: Arg) => {
      let result = map.get(name);
      if (!result) {
        result = fn(name, arg);
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
