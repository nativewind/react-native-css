import { observable } from "../../native/reactivity";
import type { Effect } from "../../native/reactivity";

/**
 * A derived observable computes on demand and caches the result until something it read changes.
 *
 * It did not: `get` recomputed whenever `didInit` was falsy, and nothing ever set it for a derived
 * observable — only the static-init branch and `set` did. So every read re-ran the read function.
 * For the resolved-style cache that is `calculateProps` on every render of every styled element,
 * which is what the cache exists to avoid.
 *
 * Recomputation on CHANGE is a separate path and stays: a dependency notifies, `effect.run` re-reads
 * and re-assigns, and subscribers are notified from there.
 */

const subscriber = (): Effect => ({ observers: new Set<Effect>(), run: () => undefined });

test("a derived observable computes once per change, not once per read", () => {
  let computed = 0;
  const source = observable(1);
  const derived = observable((read) => {
    computed += 1;
    return read(source) * 2;
  });

  expect(derived.get(subscriber())).toBe(2);
  expect(computed).toBe(1);

  for (let index = 0; index < 20; index += 1) {
    expect(derived.get(subscriber())).toBe(2);
  }

  expect(computed).toBe(1);
});

test("a derived observable recomputes when a dependency changes", () => {
  // The half that must survive the memo: caching a read is only correct if a change still lands.
  let computed = 0;
  const source = observable(1);
  const derived = observable((read) => {
    computed += 1;
    return read(source) * 2;
  });

  expect(derived.get(subscriber())).toBe(2);
  const afterFirstRead = computed;

  source.set(5);

  expect(derived.get(subscriber())).toBe(10);
  expect(computed).toBeGreaterThan(afterFirstRead);
});

test("a static observable is unaffected", () => {
  const value = observable(7);

  expect(value.get(subscriber())).toBe(7);
  value.set(9);
  expect(value.get(subscriber())).toBe(9);
});
