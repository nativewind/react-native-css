type ReduceMotionListener = (isReduceMotionEnabled: boolean) => void;

interface AccessibilityInfoDouble {
  readonly isReduceMotionEnabled?: () => Promise<boolean>;
  readonly addEventListener?: (
    event: string,
    listener: ReduceMotionListener,
  ) => { readonly remove: () => void };
}

function importReactivityWith(accessibilityInfo: AccessibilityInfoDouble) {
  jest.resetModules();
  // A Proxy over requireActual rather than a spread: spreading react-native eagerly triggers its lazy DevMenu getter and throws
  jest.doMock("react-native", () => {
    const actual = jest.requireActual<Record<string, unknown>>("react-native");

    return new Proxy(actual, {
      get: (target, property): unknown =>
        property === "AccessibilityInfo"
          ? accessibilityInfo
          : Reflect.get(target, property),
    });
  });

  return jest.requireActual<typeof import("../../native/reactivity")>(
    "../../native/reactivity",
  );
}

// Every promise the module chains settles before a macrotask runs
function settle() {
  return new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

function controlledAccessibilityInfo() {
  const listeners: ReduceMotionListener[] = [];
  let answer: (isReduceMotionEnabled: boolean) => void = () => undefined;
  const answered = new Promise<boolean>((resolve) => {
    answer = resolve;
  });

  return {
    accessibilityInfo: {
      isReduceMotionEnabled: () => answered,
      addEventListener: (event: string, listener: ReduceMotionListener) => {
        if (event === "reduceMotionChanged") listeners.push(listener);
        return { remove: () => undefined };
      },
    },
    answer,
    change: (isReduceMotionEnabled: boolean) => {
      for (const listener of listeners) listener(isReduceMotionEnabled);
    },
  };
}

describe("the reduced-motion preference", () => {
  test("is unknown until AccessibilityInfo answers", () => {
    const { accessibilityInfo } = controlledAccessibilityInfo();

    const { reducedMotion } = importReactivityWith(accessibilityInfo);

    expect(reducedMotion.get()).toBeUndefined();
  });

  test("takes AccessibilityInfo's answer, then follows its change event", async () => {
    const { accessibilityInfo, answer, change } = controlledAccessibilityInfo();
    const { reducedMotion } = importReactivityWith(accessibilityInfo);

    answer(true);
    await settle();
    expect(reducedMotion.get()).toBe("reduce");

    change(false);
    expect(reducedMotion.get()).toBe("no-preference");
  });

  test("keeps a change event over an answer that resolves after it", async () => {
    const { accessibilityInfo, answer, change } = controlledAccessibilityInfo();
    const { reducedMotion } = importReactivityWith(accessibilityInfo);

    change(true);
    answer(false);
    await settle();

    expect(reducedMotion.get()).toBe("reduce");
  });

  test("is no-preference where AccessibilityInfo rejects, without an unhandled rejection", async () => {
    const { reducedMotion } = importReactivityWith({
      isReduceMotionEnabled: () =>
        Promise.reject(new Error("NativeAccessibilityManager unavailable")),
      addEventListener: () => ({ remove: () => undefined }),
    });
    await settle();

    expect(reducedMotion.get()).toBe("no-preference");
  });

  test("is no-preference where AccessibilityInfo has no getter, without failing the import", async () => {
    const { reducedMotion } = importReactivityWith({
      addEventListener: () => ({ remove: () => undefined }),
    });
    await settle();

    expect(reducedMotion.get()).toBe("no-preference");
  });

  test("is no-preference where AccessibilityInfo has no change event, without failing the import", async () => {
    const { reducedMotion } = importReactivityWith({
      isReduceMotionEnabled: () => Promise.resolve(true),
    });
    await settle();

    expect(reducedMotion.get()).toBe("no-preference");
  });

  test("an override stands over the device's answer until the device's setting changes", async () => {
    const { accessibilityInfo, answer, change } = controlledAccessibilityInfo();
    const { reducedMotion } = importReactivityWith(accessibilityInfo);
    answer(true);
    await settle();

    reducedMotion.set("no-preference");
    expect(reducedMotion.get()).toBe("no-preference");

    reducedMotion.set(undefined);
    expect(reducedMotion.get()).toBe("reduce");

    reducedMotion.set("no-preference");
    change(false);
    change(true);
    expect(reducedMotion.get()).toBe("reduce");
  });
});
