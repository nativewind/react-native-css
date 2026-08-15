import type { Effect } from "../../native/reactivity";

/**
 * `package.json`'s `exports` map sends `import` to `dist/module/**` and
 * `require` to `dist/commonjs/**`, and Metro resolves per requesting module, so
 * a single app can hold two copies of this module. Two copies means two sets of
 * observables and two batches, and a write through one is invisible to the
 * other.
 *
 * `jest.resetModules()` followed by a fresh `import()` reproduces that exactly:
 * the source is evaluated twice against one `globalThis`. It is also fully
 * deterministic - module evaluation is synchronous and ordered, so there is no
 * clock, no listener race and nothing carried between tests.
 */
type ReactivityModule = typeof import("../../native/reactivity");

async function loadCopy(): Promise<ReactivityModule> {
  jest.resetModules();

  return import("../../native/reactivity");
}

function createSubscriber(): Effect & { runs: number } {
  const subscriber = {
    observers: new Set<Effect>(),
    runs: 0,
    run: () => {
      subscriber.runs++;
    },
  };

  return subscriber;
}

describe("dual package hazard", () => {
  test("a second evaluation really is a separate copy", async () => {
    const first = await loadCopy();
    const second = await loadCopy();

    // Vacuity guard. If the module were not re-evaluated, every sharing
    // assertion below would hold for the wrong reason. `observable` is a plain
    // function that closes over nothing process-global, so it is *expected* to
    // differ between copies - that difference is the proof there are two.
    expect(second.observable).not.toBe(first.observable);
    expect(second.family).not.toBe(first.family);
  });

  test("every piece of process-global reactive state is one object", async () => {
    const first = await loadCopy();
    const second = await loadCopy();

    // The census is the guard's own state object, so a new piece of shared
    // state is covered here the moment it is added rather than when someone
    // remembers to extend a list.
    const census = Object.keys(globalThis.__react_native_css_reactivity ?? {});

    // An empty census would make the loop below assert nothing at all.
    expect(census.length).toBeGreaterThan(0);

    for (const name of census) {
      const key = name as keyof ReactivityModule;

      // Without this, a piece of state the module forgot to re-export would
      // compare `undefined` against `undefined` and pass while sharing nothing.
      expect(first[key]).toBeDefined();
      expect(second[key]).toBe(first[key]);
    }
  });

  test("VAR_SYMBOL is shared", async () => {
    const first = await loadCopy();
    const second = await loadCopy();

    // Interned by `Symbol.for`, so this holds without a guard. Pinned because
    // switching it to a bare `Symbol()` would silently split variable lookup
    // across copies.
    expect(second.VAR_SYMBOL).toBe(first.VAR_SYMBOL);
  });

  test("a write through one copy reaches a subscriber on the other", async () => {
    const first = await loadCopy();
    const second = await loadCopy();

    const subscriber = createSubscriber();
    const initial = second.colorScheme.get(subscriber);
    const next = initial === "dark" ? "light" : "dark";

    first.colorScheme.set(next);

    expect(subscriber.runs).toBe(1);
    expect(second.colorScheme.get()).toBe(next);
  });

  test("a batch opened on one copy captures a write made through the other", async () => {
    const first = await loadCopy();
    const second = await loadCopy();

    const subscriber = createSubscriber();
    const value = second.observable(0);
    value.get(subscriber);

    // `StyleCollection.inject` and the `Dimensions` listener both open a batch
    // this way. If the batch is not one object, the write below runs its
    // observers immediately and the batch's flush finds nothing to do.
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

  test("a container observable is keyed off one family per process", async () => {
    const first = await loadCopy();
    const second = await loadCopy();

    const key = {};

    expect(second.containerLayoutFamily(key)).toBe(
      first.containerLayoutFamily(key),
    );
    expect(second.hoverFamily(key)).toBe(first.hoverFamily(key));
    expect(second.activeFamily(key)).toBe(first.activeFamily(key));
    expect(second.focusFamily(key)).toBe(first.focusFamily(key));
  });
});
