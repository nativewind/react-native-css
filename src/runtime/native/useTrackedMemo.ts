import { use, useState, type Context } from "react";

export const CHANGED = Symbol("react-native-css-changed");
export const TRACKED = Symbol("react-native-css-tracked");

const cache = new WeakMap<object, object>();

type TrackedProxy<T> = T & {
  [CHANGED](prev?: Record<string, unknown>): boolean;
  [TRACKED]: Record<string, unknown>;
};

function makeProxy<T extends object>(
  obj: T,
  path?: string,
  tracked: Record<string, unknown> = {},
): TrackedProxy<T> {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      if (prop === CHANGED) {
        return (prev: Record<string, unknown> | undefined) => {
          if (!prev || Object.is(tracked, prev)) {
            return false;
          }

          for (const key in tracked) {
            if (!Object.is(tracked[key], prev[key])) {
              return true;
            }
          }

          return false;
        };
      }

      if (prop === TRACKED) {
        return tracked;
      }

      if (typeof prop !== "string") {
        return Reflect.get(target, prop, receiver);
      }

      const fullPath = path ? `${path}.${prop}` : prop;
      const result = Reflect.get(target, prop, receiver);

      tracked[fullPath] = result;

      if (typeof result === "object" && result !== null) {
        return makeProxy(result, fullPath, tracked);
      }

      return result;
    },
  }) as TrackedProxy<T>;
}

const DEFAULT_TRACKED = { [CHANGED]: () => false, [TRACKED]: {} };

export function createTrackedProxy<T extends object>(
  obj: T | undefined | null,
): TrackedProxy<T> {
  obj ??= DEFAULT_TRACKED as T;

  let cached = cache.get(obj) as TrackedProxy<T> | undefined;
  if (!cached) {
    cached = makeProxy(Object.assign({}, DEFAULT_TRACKED, obj));
    cache.set(obj, cached);
  }
  return cached;
}

/**
 * Turns a Context<T> into a lazy proxy that tracks changes.
 */
export function createLazyContextProxy<C extends object>(context: Context<C>) {
  return new Proxy(
    {},
    {
      get(target, prop, receiver) {
        target = use(context);
        return Reflect.get(target, prop, receiver) as C[keyof C];
      },
    },
  ) as C;
}

export function useAutoTrackedMemo<R>(
  fn: (...args: object[]) => R,
  ...args: Parameters<typeof fn>
): R | undefined {
  const [lastValues, setLastValues] = useState<
    Record<string, Record<string, unknown>>
  >({});

  const trackedArgs = args.map((arg) => createTrackedProxy(arg));
  const result = fn(...trackedArgs);

  const changed = trackedArgs.some((trackedArg, index) => {
    return trackedArg[CHANGED](lastValues[`${index}`]);
  });

  if (changed) {
    setLastValues({});
  }

  return result;
}
