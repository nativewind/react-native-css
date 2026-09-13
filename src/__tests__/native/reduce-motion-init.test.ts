// src/native/reactivity.ts is the root of every media feature — colorScheme, vw/vh,
// containers and reduceMotion all live there. Seeding reduceMotion reaches out to
// AccessibilityInfo at module scope, so a host without a native AccessibilityInfo
// must not take the whole module down with it.
//
// A Proxy over requireActual rather than a spread: spreading react-native eagerly
// triggers its lazy DevMenu getter and throws.
const noopSubscription = { remove: () => undefined };

const withAccessibilityInfo =
  (accessibilityInfo: unknown) => (): Record<string, unknown> => {
    const actual = jest.requireActual<Record<string, unknown>>("react-native");

    return new Proxy(actual, {
      get: (target, property): unknown =>
        property === "AccessibilityInfo"
          ? accessibilityInfo
          : Reflect.get(target, property),
    });
  };

describe("an AccessibilityInfo without isReduceMotionEnabled", () => {
  test("does not stop the reactivity module importing", async () => {
    jest.resetModules();
    jest.doMock(
      "react-native",
      withAccessibilityInfo({ addEventListener: () => noopSubscription }),
    );

    const reactivity = await import("../../native/reactivity");

    expect(reactivity.reduceMotion.get()).toBe(false);
    expect(reactivity.colorScheme).toBeDefined();
    expect(reactivity.vw).toBeDefined();
  });
});

describe("an AccessibilityInfo whose getter rejects", () => {
  test("leaves the safe default in place and does not reject unhandled", async () => {
    jest.resetModules();
    jest.doMock(
      "react-native",
      withAccessibilityInfo({
        isReduceMotionEnabled: () =>
          Promise.reject(new Error("NativeAccessibilityManager unavailable")),
        addEventListener: () => noopSubscription,
      }),
    );

    const reactivity = await import("../../native/reactivity");
    await Promise.resolve();

    expect(reactivity.reduceMotion.get()).toBe(false);
  });
});

describe("a working AccessibilityInfo", () => {
  test("seeds reduceMotion from it and stays live on the change event", async () => {
    jest.resetModules();
    let changed: ((enabled: boolean) => void) | undefined;
    jest.doMock(
      "react-native",
      withAccessibilityInfo({
        isReduceMotionEnabled: () => Promise.resolve(true),
        addEventListener: (event: string, listener: (v: boolean) => void) => {
          if (event === "reduceMotionChanged") changed = listener;
          return noopSubscription;
        },
      }),
    );

    const reactivity = await import("../../native/reactivity");
    await Promise.resolve();

    // The seed is what connects the observable to the OS at all; without it the
    // flag is a value the library only ever writes to itself
    expect(reactivity.reduceMotion.get()).toBe(true);

    expect(changed).toBeDefined();
    changed?.(false);
    expect(reactivity.reduceMotion.get()).toBe(false);
  });
});
