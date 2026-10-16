import {
  cleanupEffect,
  family,
  observable,
  observeReads,
  recordReads,
  weakFamily,
  type Effect,
  type Getter,
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
  const compute = jest.fn((get: Getter) =>
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

test("a computed value read without a subscriber is computed once until a source changes", () => {
  const source = observable(10);
  const compute = jest.fn((get: Getter) => ({ doubled: get(source) * 2 }));
  const value = observable(compute);
  const first = value.get();
  expect(value.get()).toBe(first);
  expect(compute).toHaveBeenCalledTimes(1);
  source.set(20);
  expect(value.get()).toEqual({ doubled: 40 });
  expect(compute).toHaveBeenCalledTimes(2);
});

test("a read without a subscriber subscribes nothing", () => {
  const source = observable(10);
  const value = observable((get) => get(source) * 2);
  value.get();
  expect(source.observers.size).toBe(0);
  expect(value.observers.size).toBe(0);
});

test("a first subscriber keeps the value an unsubscribed read computed", () => {
  const source = observable(10);
  const compute = jest.fn((get: Getter) => ({ doubled: get(source) * 2 }));
  const value = observable(compute);
  const read = value.get();
  const run = jest.fn();
  const subscriber: Effect = { observers: new Set(), run };
  expect(value.get(subscriber)).toBe(read);
  expect(compute).toHaveBeenCalledTimes(1);
  source.set(20);
  expect(run).toHaveBeenCalledTimes(1);
  expect(value.get(subscriber)).toEqual({ doubled: 40 });
  cleanupEffect(subscriber);
});

test("a chain of computed values read without subscribers follows a change at its root", () => {
  const root = observable(1);
  const middle = observable((get) => get(root) + 1);
  const leaf = observable((get) => get(middle) * 10);
  expect(leaf.get()).toBe(20);
  root.set(4);
  expect(leaf.get()).toBe(50);
  expect(root.observers.size).toBe(0);
});

test("a value released by its last subscriber is not computed again until a source changes", () => {
  const source = observable(10);
  const compute = jest.fn((get: Getter) => get(source) * 2);
  const value = observable(compute);
  const subscriber: Effect = { observers: new Set(), run: jest.fn() };
  value.get(subscriber);
  cleanupEffect(subscriber);
  expect(value.get()).toBe(20);
  expect(compute).toHaveBeenCalledTimes(1);
  source.set(30);
  expect(value.get()).toBe(60);
  expect(compute).toHaveBeenCalledTimes(2);
});

test("an observable's version moves only when its value changes", () => {
  const source = observable(1);
  const parity = observable((get) => get(source) % 2);
  const sourceVersion = source.version;
  parity.get();
  const parityVersion = parity.version;
  source.set(1);
  expect(source.version).toBe(sourceVersion);
  source.set(3);
  expect(source.version).not.toBe(sourceVersion);
  parity.get();
  expect(parity.version).toBe(parityVersion);
  source.set(4);
  parity.get();
  expect(parity.version).not.toBe(parityVersion);
});

test("recorded reads subscribe nothing until a commit observes them", () => {
  const source = observable(10);
  const value = observable((get) => get(source) * 2);
  const recorded = recordReads();
  expect(recorded.read(value)).toBe(20);
  expect(value.observers.size).toBe(0);
  const subscriber: Effect = { observers: new Set(), run: jest.fn() };
  expect(observeReads(subscriber, recorded.reads)).toBe("unmoved");
  expect(value.observers.has(subscriber)).toBe(true);
  cleanupEffect(subscriber);
});

test("observing recorded reads answers moved for a change since the read", () => {
  const source = observable(10);
  const value = observable((get) => get(source) * 2);
  const recorded = recordReads();
  recorded.read(value);
  source.set(30);
  const run = jest.fn();
  const subscriber: Effect = { observers: new Set(), run };
  expect(observeReads(subscriber, recorded.reads)).toBe("moved");
  expect(run).not.toHaveBeenCalled();
  cleanupEffect(subscriber);
});

test("observing recorded reads releases what the effect observed and the commit no longer read", () => {
  const first = observable(1);
  const second = observable(2);
  const subscriber: Effect = { observers: new Set(), run: jest.fn() };
  const before = recordReads();
  before.read(first);
  observeReads(subscriber, before.reads);
  const after = recordReads();
  after.read(second);
  observeReads(subscriber, after.reads);
  expect(first.observers.size).toBe(0);
  expect(second.observers.has(subscriber)).toBe(true);
  cleanupEffect(subscriber);
});
