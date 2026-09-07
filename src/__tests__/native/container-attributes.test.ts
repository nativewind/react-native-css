import { containerAttributesFamily } from "../../native/reactivity";
import type { Effect } from "../../native/reactivity";

/**
 * A container publishes its props after every commit of its own component, so the observable's
 * equality is what stands between an ancestor re-rendering and every descendant that reads it
 * re-evaluating its rules.
 *
 * The values a selector can compare are strings; everything else it can only ask about for
 * presence. `children`, `style` and every handler are fresh objects on each render and are
 * indistinguishable to a selector, so a change in their identity must not notify — while a change
 * in a `dataSet` key, which is also a fresh object every render, must.
 */
const container = { label: "container" };

const countingEffect = (): { effect: Effect; runs: () => number } => {
  let runs = 0;
  const effect: Effect = { observers: new Set(), run: () => void (runs += 1) };
  return { effect, runs: () => runs };
};

test("a republish that changed nothing a selector can see does not notify", () => {
  const { effect, runs } = countingEffect();
  const observable = containerAttributesFamily(container);
  observable.get(effect);

  const dataSet = { open: true };
  observable.set({ dataSet, style: { flex: 1 }, children: {} });
  expect(runs()).toBe(1);

  // A re-render: same values, every object freshly allocated.
  observable.set({ dataSet: { open: true }, style: { flex: 1 }, children: {} });
  expect(runs()).toBe(1);
});

test("a change to a dataSet value notifies", () => {
  const { effect, runs } = countingEffect();
  const observable = containerAttributesFamily({ label: "value" });
  observable.get(effect);

  observable.set({ dataSet: { open: true } });
  expect(runs()).toBe(1);

  observable.set({ dataSet: { open: false } });
  expect(runs()).toBe(2);
});

test("adding or removing a dataSet key notifies", () => {
  const { effect, runs } = countingEffect();
  const observable = containerAttributesFamily({ label: "keys" });
  observable.get(effect);

  observable.set({ dataSet: { open: true } });
  expect(runs()).toBe(1);

  observable.set({ dataSet: { open: true, state: "x" } });
  expect(runs()).toBe(2);

  observable.set({ dataSet: { open: true } });
  expect(runs()).toBe(3);
});

test("a prop appearing or disappearing notifies, because presence is answerable", () => {
  const { effect, runs } = countingEffect();
  const observable = containerAttributesFamily({ label: "presence" });
  observable.get(effect);

  observable.set({ disabled: true });
  expect(runs()).toBe(1);

  observable.set({});
  expect(runs()).toBe(2);
});

test("the first publish from undefined notifies", () => {
  const { effect, runs } = countingEffect();
  const observable = containerAttributesFamily({ label: "first" });

  // The pre-publish reading: a descendant that renders before its ancestor's effect has run.
  expect(observable.get(effect)).toBeUndefined();

  observable.set({ dataSet: { open: true } });
  expect(runs()).toBe(1);
});
