import {
  drainObservableBatch,
  observable,
  observableBatch,
} from "../../native/reactivity";
import type { Effect } from "../../native/reactivity";

/**
 * A batch drain must run every effect it collects, INCLUDING one re-notified while it drains.
 *
 * The drain used to iterate the batch `Set` directly, and iterating a Set does not revisit a member
 * it has already passed. So an effect notified a second time — because a derived observable it
 * depends on recomputed after the effect ran — was dropped.
 *
 * That was survivable only while every `get` recomputed: whenever the effect happened to run it
 * pulled fresh values out of its dependencies. Once a derived observable memoises, the effect reads
 * the value its dependency held BEFORE the recompute and nothing runs it again, so the stale value
 * is permanent. This is the diamond that makes it observable: one source, two derived readers, one
 * subscriber reading both.
 */

test("an effect re-notified during a drain runs again", () => {
  // The shape is a diamond where the DEPENDENT is notified before its dependency: the subscriber
  // reads the source directly AND through a derived observable that also reads it. Subscribing to
  // the source first puts the subscriber ahead of the derived one in the batch, so it runs while
  // the derived value is still stale — and the derived one's later notification lands on a member
  // the iteration has already passed.
  //
  // That is exactly `vw -> { stylesObs, rootVariables } -> stylesObs`: a style reaching a viewport
  // unit directly through the unit resolver, and again through a root variable whose media query
  // tests a width.
  const source = observable(1);
  const derived = observable((read) => read(source) * 10);

  const seen: string[] = [];
  const subscriber: Effect = {
    observers: new Set<Effect>(),
    run: () => {
      seen.push(`${String(source.get())},${String(derived.get())}`);
    },
  };

  // Order matters: the direct edge first.
  source.get(subscriber);
  derived.get(subscriber);

  observableBatch.current = new Set<Effect>();
  source.set(2);
  drainObservableBatch();
  observableBatch.current = undefined;

  // The subscriber's LAST observation must see both at the new value. Dropping the re-notification
  // leaves it holding the derived value from before the source changed — permanently, because
  // nothing runs it again.
  expect(seen.at(-1)).toBe("2,20");
});

test("a drain with nothing collected is a no-op", () => {
  observableBatch.current = new Set<Effect>();
  expect(() => {
    drainObservableBatch();
  }).not.toThrow();
  observableBatch.current = undefined;

  // And with no batch open at all.
  expect(() => {
    drainObservableBatch();
  }).not.toThrow();
});
