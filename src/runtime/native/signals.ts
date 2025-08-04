// signals.ts

type Subscriber = () => void;

export interface Signal<T> {
  _get(): T;
  _subs: Set<Subscriber>;
  set(value: T): void;
  subscribe(fn: Subscriber): () => void;
}

export type GetFunction = <T>(sig: Signal<T>) => T;

export function signal<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  const subscribers = new Set<Subscriber>();

  function _get(): T {
    return value;
  }

  function set(newValue: T): void {
    if (newValue !== value) {
      value = newValue;
      for (const fn of subscribers) {
        if (isBatching) {
          batchQueue.add(fn);
        } else {
          fn();
        }
      }
    }
  }

  function subscribe(fn: Subscriber): () => void {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  return { _get, _subs: subscribers, set, subscribe };
}

// computed

export function computed<T>(fn: (get: GetFunction) => T) {
  const s = signal<T>(undefined as unknown as T);

  const cleanupFns = new Set<() => void>();

  const run = (): void => {
    s.set(fn(get));
  };

  const get: GetFunction = (signal) => {
    signal._subs.add(run);
    cleanupFns.add(() => signal._subs.delete(run));
    return signal._get();
  };

  run();

  return s;
}

// Batching system

let isBatching = false;
const batchQueue = new Set<Subscriber>();

function flushBatch(): void {
  const queue = Array.from(batchQueue);
  batchQueue.clear();
  isBatching = false;
  for (const fn of queue) fn();
}

export function batch(fn: (get: GetFunction) => void): void {
  isBatching = true;
  fn((sig) => sig._get());
  flushBatch();
}
