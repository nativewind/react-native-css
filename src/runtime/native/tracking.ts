import { use, useState, type Context } from "react";

const LOCK = Symbol("react-native-css-lock");

const IS_EQUAL = Symbol("react-native-css-is-equal");
interface IsEqualObject {
  [IS_EQUAL]: (other: unknown) => boolean;
}

export type GetFunction = <T>(sig: Signal<T>) => T;
type Subscriber = () => void;

export interface Signal<T> {
  _get(): T;
  _subs: Set<Subscriber>;
  set(value: T): void;
  subscribe(fn: Subscriber): () => void;
}

function cleanupSubscriptions(subscriptions: Set<() => void>): void {
  for (const dispose of subscriptions) {
    dispose();
  }
  subscriptions.clear();
}

/**
 * A custom built watcher for the library
 */
export function useDeepWatcher<
  T extends object,
  Configs extends object,
  Props extends object,
  Variables extends object,
  Containers extends object,
>(
  fn: (get: GetFunction, ...args: [Configs, Props, Variables, Containers]) => T,
  deps: [
    Configs,
    Props | undefined | null,
    Context<Variables>,
    Context<Containers>,
  ],
) {
  const [state, setState] = useState(() => {
    const subscriptions = new Set<Subscriber>();

    const configs = deps[0];
    const props = makeAccessTreeProxy(deps[1] ?? ({} as Props));

    const lazyVariables = makeLazyContext(deps[2]);
    const variables = makeAccessTreeProxy(lazyVariables);

    const lazyContainers = makeLazyContext(deps[3]);
    const containers = makeAccessTreeProxy(lazyContainers);

    const get: GetFunction = (signal) => {
      const dispose = signal.subscribe(() => {
        cleanupSubscriptions(subscriptions);

        lazyVariables[LOCK] = true;
        lazyContainers[LOCK] = true;

        setState((s) => ({
          ...s,
          value: fn(get, configs, props, variables, containers),
        }));
      });

      subscriptions.add(dispose);
      return signal._get();
    };

    const value = fn(get, configs, props, variables, containers);

    return {
      value,
      subscriptions,
      deps: [configs, props, variables, containers],
    };
  });

  if (
    state.deps.some((dep, index) => {
      return !(dep as IsEqualObject)[IS_EQUAL](deps[index]);
    })
  ) {
    setState((s) => {
      const subscriptions = s.subscriptions;
      cleanupSubscriptions(subscriptions);

      const configs = deps[0];
      const props = makeAccessTreeProxy(deps[1] ?? ({} as Props));

      const lazyVariables = makeLazyContext(deps[2]);
      const variables = makeAccessTreeProxy(lazyVariables);

      const lazyContainers = makeLazyContext(deps[3]);
      const containers = makeAccessTreeProxy(lazyContainers);

      const get: GetFunction = (signal) => {
        const dispose = signal.subscribe(() => {
          cleanupSubscriptions(subscriptions);

          lazyVariables[LOCK] = true;
          lazyContainers[LOCK] = true;

          setState((s) => ({
            ...s,
            value: fn(get, configs, props, variables, containers),
          }));
        });

        subscriptions.add(dispose);
        return signal._get();
      };

      return {
        value: fn(get, configs, props, variables, containers),
        subscriptions: s.subscriptions,
        deps: [configs, props, variables, containers],
      };
    });
  }

  return state.value;
}

function makeLazyContext<T extends object>(context: React.Context<T>) {
  let locked = false;
  let ctx: T | undefined;

  return new Proxy(
    {},
    {
      get(_, prop, receiver) {
        if (prop === LOCK) {
          locked = true;
          return undefined;
        }

        if (locked) {
          if (ctx === undefined) {
            return;
          }
          return Reflect.get(ctx, prop, receiver);
        }

        ctx ??= makeAccessTreeProxy(use(context));

        return Reflect.get(ctx, prop, receiver);
      },
    },
  ) as T & { [LOCK]: true };
}

function makeAccessTreeProxy<T extends object>(value: T): T {
  const branches = new Map<keyof T, object>();

  return new Proxy(value, {
    get(target, prop, receiver) {
      if (prop === IS_EQUAL) {
        return (other: T) => {
          return (
            Object.is(target, other) ||
            Array.from(branches).every(([key, child]) => {
              return typeof child === "object" && IS_EQUAL in child
                ? (child as IsEqualObject)[IS_EQUAL](other[key])
                : Object.is(child, other[key]);
            })
          );
        };
      }

      const value = Reflect.get(target, prop, receiver);

      if (typeof value === "object" && value !== null) {
        const proxy = makeAccessTreeProxy(value);
        branches.set(prop as keyof T, proxy);
        return proxy;
      } else {
        return value;
      }
    },
  });
}
