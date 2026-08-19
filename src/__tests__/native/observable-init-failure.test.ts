import { observable } from "../../native/reactivity";
import type { Effect } from "../../native/reactivity";

/**
 * A read that throws must leave nothing behind.
 *
 * `get` registered the caller's effect BEFORE running the read function, so a compute that threw
 * left a subscriber attached to an observable that had never initialised. Nothing had been
 * published to that subscriber and nothing was owed to it, but it was on the list — so the next
 * change notified an observer for a value it had never been given, and the observable's "does
 * anyone observe me" answer counted a subscriber that had never successfully read.
 *
 * Registering after a successful compute makes the failure leave no trace: a throw propagates to
 * the caller, and the observable is exactly as it was before the call.
 */

const subscriber = (): Effect => ({
  observers: new Set<Effect>(),
  run: () => undefined,
});

test("a read that throws registers no observer", () => {
  let shouldThrow = true;
  const source = observable(1);
  const derived = observable((read) => {
    if (shouldThrow) {
      throw new Error("compute failed");
    }
    return read(source);
  });

  const first = subscriber();
  expect(() => derived.get(first)).toThrow("compute failed");

  // Nothing succeeded, so nothing is subscribed — in either direction.
  expect(derived.observers.size).toBe(0);
  expect(first.observers.size).toBe(0);

  // And the observable is still usable once the condition clears.
  shouldThrow = false;
  const second = subscriber();
  expect(derived.get(second)).toBe(1);
  expect(derived.observers.size).toBe(1);
});

test("a successful read still registers", () => {
  const source = observable(5);
  const derived = observable((read) => read(source) * 2);
  const reader = subscriber();

  expect(derived.get(reader)).toBe(10);
  expect(derived.observers.has(reader)).toBe(true);
  expect(reader.observers.size).toBeGreaterThan(0);
});
