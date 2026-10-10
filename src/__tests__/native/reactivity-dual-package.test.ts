import type { Effect } from "../../native/reactivity";

type ReactivityModule = typeof import("../../native/reactivity");

// A fresh module registry evaluates the module again against the same globalThis, as a second build in one app does
function loadCopy(): ReactivityModule {
  jest.resetModules();
  return jest.requireActual<ReactivityModule>("../../native/reactivity");
}

function createSubscriber(): Effect & { runs: number } {
  const subscriber: Effect & { runs: number } = {
    observers: new Set(),
    runs: 0,
    run: () => {
      subscriber.runs++;
    },
  };

  return subscriber;
}

describe("two evaluations of the reactivity module", () => {
  test("are two copies", () => {
    const first = loadCopy();
    const second = loadCopy();

    expect(second.observable).not.toBe(first.observable);
  });

  test("share every piece of process-global state", () => {
    const first = loadCopy();
    const second = loadCopy();
    const census = Object.keys(globalThis.__react_native_css_reactivity ?? {});

    expect(census.length).toBeGreaterThan(0);

    for (const name of census) {
      const key = name as keyof ReactivityModule;

      expect(first[key]).toBeDefined();
      expect(second[key]).toBe(first[key]);
    }
  });

  test("deliver a write through one to a subscriber on the other", () => {
    const first = loadCopy();
    const second = loadCopy();
    const subscriber = createSubscriber();
    const next =
      second.colorScheme.get(subscriber) === "dark" ? "light" : "dark";

    first.colorScheme.set(next);

    expect(subscriber.runs).toBe(1);
    expect(second.colorScheme.get()).toBe(next);
  });

  test("batch a write through one inside a batch the other opened", () => {
    const first = loadCopy();
    const second = loadCopy();
    const subscriber = createSubscriber();
    const value = second.observable(0);
    value.get(subscriber);

    first.observableBatch.current = new Set<Effect>();
    value.set(1);

    expect(subscriber.runs).toBe(0);
    expect(first.observableBatch.current.size).toBe(1);

    for (const effect of first.observableBatch.current) {
      effect.run();
    }
    first.observableBatch.current = undefined;

    expect(subscriber.runs).toBe(1);
  });

  test("key a component's interaction and layout observables off one family", () => {
    const first = loadCopy();
    const second = loadCopy();
    const key = {};

    expect(second.containerLayoutFamily(key)).toBe(
      first.containerLayoutFamily(key),
    );
    expect(second.hoverFamily(key)).toBe(first.hoverFamily(key));
    expect(second.activeFamily(key)).toBe(first.activeFamily(key));
    expect(second.focusFamily(key)).toBe(first.focusFamily(key));
  });
});
