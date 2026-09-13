import {
  cleanupEffect,
  family,
  observable,
  weakFamily,
  type Effect,
} from "../../native/reactivity";

test.each([0, false, "", null, undefined, NaN])(
  "families retain a cached %p until explicitly invalidated",
  (result) => {
    const create = jest.fn(() => result);
    const cached = family(create);
    expect(cached("first")).toBe(result);
    expect(cached("first")).toBe(result);
    expect(create).toHaveBeenCalledTimes(1);
    cached("second");
    expect(create).toHaveBeenCalledTimes(2);
    expect(cached.delete("first")).toBe(true);
    cached("first");
    expect(create).toHaveBeenCalledTimes(3);
    cached.clear();
    cached("first");
    cached("second");
    expect(create).toHaveBeenCalledTimes(5);
  },
);

test.each([0, false, "", null, undefined, NaN])(
  "weak families retain a cached %p for each key",
  (result) => {
    const create = jest.fn(() => result);
    const cached = weakFamily(create);
    const key = {};
    expect(cached.has(key)).toBe(false);
    expect(cached(key)).toBe(result);
    expect(cached.has(key)).toBe(true);
    expect(cached(key)).toBe(result);
    expect(create).toHaveBeenCalledTimes(1);
    cached({});
    expect(create).toHaveBeenCalledTimes(2);
  },
);

test("weak family identity numbering keeps its first zero identifier", () => {
  let nextId = 0;
  const identify = weakFamily(() => nextId++);
  const first = {};
  const second = {};
  expect(identify(first)).toBe(0);
  expect(identify(second)).toBe(1);
  expect(identify(first)).toBe(0);
  expect(identify(second)).toBe(1);
  expect(nextId).toBe(2);
});

test("computed dependencies follow a conditional branch even when its value is unchanged", () => {
  const first = observable(10);
  const second = observable(10);
  const selected = observable(true);
  const compute = jest.fn((get: import("../../native/reactivity").Getter) =>
    get(selected) ? get(first) : get(second),
  );
  const value = observable(compute);
  const subscriber: Effect = { observers: new Set(), run: jest.fn() };
  expect(value.get(subscriber)).toBe(10);
  expect(first.observers.size).toBe(1);
  selected.set(false);
  expect(value.get(subscriber)).toBe(10);
  expect(first.observers.size).toBe(0);
  expect(second.observers.size).toBe(1);
  const calls = compute.mock.calls.length;
  first.set(20);
  expect(compute).toHaveBeenCalledTimes(calls);
  second.set(30);
  expect(value.get(subscriber)).toBe(30);
  cleanupEffect(subscriber);
  expect(selected.observers.size).toBe(0);
  expect(second.observers.size).toBe(0);
});

test("explicit recomputation without subscribers does not leave a stale computed cache", () => {
  const source = observable(10);
  const value = observable<number>((get) => get(source) * 2);
  value.set(0);
  expect(value.get()).toBe(20);
  source.set(30);
  expect(value.get()).toBe(60);
  expect(source.observers.size).toBe(0);
});

test("an explicit computed argument replaces its previous dependency", () => {
  const first = observable(10);
  const second = observable(20);
  const value = observable<number, boolean>((get, useFirst = true) =>
    useFirst ? get(first) : get(second),
  );
  const subscriber: Effect = { observers: new Set(), run: jest.fn() };
  expect(value.get(subscriber)).toBe(10);
  value.set(false);
  expect(value.get(subscriber)).toBe(20);
  expect(first.observers.size).toBe(0);
  expect(second.observers.size).toBe(1);
  cleanupEffect(subscriber);
  expect(second.observers.size).toBe(0);
});
