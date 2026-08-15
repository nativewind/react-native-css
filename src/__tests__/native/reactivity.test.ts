import {
  observable,
  observableBatch,
  type Effect,
  type Observable,
} from "../../native/reactivity";

/**
 * `observableBatch` is module state. A scenario that throws mid-batch would
 * otherwise leak an open batch into the next test, so every test starts from a
 * closed batch regardless of how the previous one ended.
 */
beforeEach(() => {
  observableBatch.current = undefined;
});

interface Spy extends Effect {
  runs: number;
}

function createSpy(onRun?: () => void): Spy {
  const spy: Spy = {
    observers: new Set<Effect>(),
    runs: 0,
    run: () => {
      spy.runs++;
      onRun?.();
    },
  };

  return spy;
}

function openBatch() {
  observableBatch.current = new Set<Effect>();
}

function flushBatch() {
  const batch = observableBatch.current;

  if (!batch) {
    throw new Error("flushBatch() called without an open batch");
  }

  try {
    // Mirrors the flush in `StyleCollection.inject` and the `Dimensions`
    // listener: effects queued *during* the flush are visited by the same loop.
    for (const effect of batch) {
      effect.run();
    }
  } finally {
    observableBatch.current = undefined;
  }
}

/**
 * The ways a value can be read out of an observable. Every one of them must be
 * side effect free as far as *other* subscribers are concerned.
 */
const readKinds = {
  none: () => undefined,
  bare: (obs: Observable<number>) => obs.get(),
  withEffect: (obs: Observable<number>) => obs.get(createSpy()),
} as const;

type ReadKind = keyof typeof readKinds;

const readKindNames = Object.keys(readKinds) as ReadKind[];

/**
 * A write, expressed as the individual steps the public API exposes. The
 * interleaved read is spliced into every gap in this list, which is what makes
 * the table exhaustive over "where can a read land" rather than over one
 * hand-picked interleaving.
 */
function writeSteps(
  source: Observable<number>,
  batched: boolean,
  next: number,
): (() => void)[] {
  const write = () => {
    source.set(next);
  };

  return batched ? [openBatch, write, flushBatch] : [write];
}

/**
 * How the derived observable maps its source. `collapse` is the other half of
 * the class: a source change it swallows must reach no subscriber, so it pins
 * the fix against over-notifying.
 */
const derivations = {
  identity: (value: number) => value,
  collapse: (value: number) => Math.min(value, 1),
} as const;

type Derivation = keyof typeof derivations;

const derivationNames = Object.keys(derivations) as Derivation[];

interface Scenario {
  readonly batched: boolean;
  readonly derivation: Derivation;
  readonly readKind: ReadKind;
  /** Gap in the write's step list that the interleaved read is spliced into. */
  readonly readAt: number;
}

interface ScenarioResult {
  /** How many times the subscriber was notified across the whole sequence. */
  readonly notifications: number;
}

/**
 * Includes a return to an already-seen value (3 -> 1) and a write that changes
 * nothing (1 -> 1). A single write cannot distinguish "the subscriber is up to
 * date" from "the guard happens to compare against the right value once".
 */
const writeSequence = [2, 3, 1, 1, 2] as const;

function runScenario(scenario: Scenario): ScenarioResult {
  const source = observable(1);
  const derive = derivations[scenario.derivation];
  const derived = observable<number>((read) => derive(read(source)));

  let notifications = 0;
  // The subscriber re-reads when it runs, exactly as a re-rendering component
  // does. `lastSeen` is therefore the observable's value as this subscriber
  // understands it.
  let lastSeen: number;
  const subscriber: Effect = {
    observers: new Set<Effect>(),
    run: () => {
      notifications++;
      lastSeen = derived.get(subscriber);
    },
  };

  // Subscribing *is* the first read, so this is the value the subscriber holds.
  lastSeen = derived.get(subscriber);

  for (const next of writeSequence) {
    const steps = writeSteps(source, scenario.batched, next);
    steps.splice(scenario.readAt, 0, () => {
      readKinds[scenario.readKind](derived);
    });

    for (const step of steps) {
      step();
    }

    // The class: once a write has settled, no subscriber is holding a stale
    // view. A read anywhere in the sequence must not change this.
    expect(lastSeen).toBe(derived.get());
  }

  return { notifications };
}

/** How many of `writeSequence`'s writes actually move the derived value. */
function expectedNotifications(derivation: Derivation): number {
  const derive = derivations[derivation];
  let current = derive(1);

  return writeSequence.reduce((count, next) => {
    const derived = derive(next);
    const changed = !Object.is(derived, current);
    current = derived;

    return changed ? count + 1 : count;
  }, 0);
}

function scenarios(): Scenario[] {
  const table: Scenario[] = [];

  for (const batched of [false, true]) {
    // A read can land before every step and after the last one.
    const gaps = (batched ? 3 : 1) + 1;

    for (const derivation of derivationNames) {
      for (const readKind of readKindNames) {
        for (let readAt = 0; readAt < gaps; readAt++) {
          table.push({ batched, derivation, readKind, readAt });
        }
      }
    }
  }

  return table;
}

describe("observable notifications survive an interleaved read", () => {
  test.each(scenarios())(
    "batched=$batched $derivation read=$readKind@$readAt",
    (scenario) => {
      const { notifications } = runScenario(scenario);

      // The other half of the class: a read may not manufacture a notification
      // either. Only writes that move the derived value may notify.
      expect(notifications).toBe(expectedNotifications(scenario.derivation));
    },
  );

  test.each([{ coObserverFirst: true }, { coObserverFirst: false }])(
    "a co-observer that reads during the fan-out (first=$coObserverFirst)",
    ({ coObserverFirst }) => {
      const src = observable(1);
      const derived = observable<number>((read) => read(src));
      const subscriber = createSpy();

      // Runs during `src`'s fan-out and reads `derived` while `derived`'s own
      // effect is still queued behind it.
      const coObserver = createSpy(() => {
        derived.get();
      });

      if (coObserverFirst) {
        src.get(coObserver);
        derived.get(subscriber);
      } else {
        derived.get(subscriber);
        src.get(coObserver);
      }

      src.set(2);

      expect(coObserver.runs).toBe(1);
      expect(subscriber.runs).toBe(1);
      expect(derived.get()).toBe(2);
    },
  );

  test("set() still notifies after a read refreshed the cache", () => {
    // `vw`/`vh`'s shape: an explicit argument wins, otherwise fall back to
    // whatever the reader computes. Nothing requires that fallback to be a
    // tracked observable, so a read can refresh the cache with no notification
    // pending behind it to deliver the change instead.
    let untracked = 1;
    const derived = observable<number, number>(
      (_read, arg) => arg ?? untracked,
    );
    const subscriber = createSpy();

    expect(derived.get(subscriber)).toBe(1);

    untracked = 2;
    // A read, not a write: it refreshes the cache but owes nobody anything.
    expect(derived.get()).toBe(2);

    // The subscriber has still only ever seen 1, so this must reach it.
    derived.set(2);

    expect(subscriber.runs).toBe(1);
  });
});
