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

const subscriber = (): Effect => ({
  observers: new Set<Effect>(),
  run: () => undefined,
});

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
  expect(computed).toBe(1);

  source.set(5);

  // Exactly one recompute for the change, and none for the read that follows it. `toBeGreaterThan`
  // would be satisfied by the per-read recompute this commit removes, so it would pass on both
  // sides and guard nothing.
  expect(derived.get(subscriber())).toBe(10);
  expect(computed).toBe(2);
});

test("a conditional dependency is picked up the first time the branch is taken", () => {
  // The classic memo hazard: the first compute takes a branch that never reads B, so B is never
  // registered. It holds here because `effect.run` re-executes the read function and PULLS B's
  // current value in the same pass that registers it — registration and the correct read are the
  // same act, so nothing waits on a notification that was never owed.
  let computed = 0;
  const gate = observable(0);
  const hidden = observable(100);
  const derived = observable((read) => {
    computed += 1;
    return read(gate) > 0 ? read(hidden) : -1;
  });

  expect(derived.get(subscriber())).toBe(-1);
  expect(hidden.observers.size).toBe(0);

  // A change to the unread branch cannot matter, and must not recompute.
  hidden.set(200);
  expect(derived.get(subscriber())).toBe(-1);

  // Opening the gate must pick up the CURRENT value of the branch it now reads.
  gate.set(1);
  expect(derived.get(subscriber())).toBe(200);
  expect(hidden.observers.size).toBeGreaterThan(0);

  // And it tracks from then on.
  hidden.set(300);
  expect(derived.get(subscriber())).toBe(300);
  expect(computed).toBeGreaterThan(1);
});

test("a static observable is unaffected", () => {
  const value = observable(7);

  expect(value.get(subscriber())).toBe(7);
  value.set(9);
  expect(value.get(subscriber())).toBe(9);
});
