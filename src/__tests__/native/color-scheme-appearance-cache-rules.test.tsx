import { Appearance, type ColorSchemeName } from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

import { colorScheme as colorSchemeObservable } from "../../native/reactivity";

// Declared here, since babel's jest.mock hoist check reads a parameter name in an inline constructor type as a variable
interface AppearancePreferences {
  colorScheme: unknown;
}
type NativeEventEmitterConstructor = new (nativeModule: unknown) => {
  addListener: (
    event: string,
    listener: (preferences: AppearancePreferences) => void,
  ) => void;
};
type AppearanceEmitterConstructor = new () => {
  emit: (event: string, payload: AppearancePreferences) => void;
  addListener: (
    event: string,
    listener: (payload: AppearancePreferences) => void,
  ) => { remove: () => void };
};
interface CacheWriteRule {
  handBack: unknown;
  setColorScheme: (requested: unknown) => unknown;
}

// Each band of the react-native >= 0.81 peer range writes Appearance's cache by its own rule; the device under all of them applies a write later, reports the scheme in force, and echoes only a resolved change
jest.mock("react-native/Libraries/Utilities/Appearance", () => {
  const NativeEventEmitter = jest.requireActual<{ default: unknown }>(
    "react-native/Libraries/EventEmitter/NativeEventEmitter",
  ).default as NativeEventEmitterConstructor;
  const EventEmitter = jest.requireActual<{ default: unknown }>(
    "react-native/Libraries/vendor/emitter/EventEmitter",
  ).default as AppearanceEmitterConstructor;

  let operatingSystemScheme = "dark";
  let appliedScheme = operatingSystemScheme;
  let pendingRequest: string | undefined;

  const nativeAppearance = {
    addListener: () => undefined,
    getColorScheme: (): string | null => appliedScheme,
    removeListeners: () => undefined,
    setColorScheme: (next: string) => {
      pendingRequest = next;
    },
  };

  const cacheWriteRules = new Map<string, CacheWriteRule>([
    [
      "<=0.81.5",
      {
        handBack: null,
        setColorScheme: (requested: unknown) => {
          nativeAppearance.setColorScheme(
            (requested as string | null) ?? "unspecified",
          );
          return nativeAppearance.getColorScheme();
        },
      },
    ],
    [
      "0.82.0-0.84.1",
      {
        handBack: "unspecified",
        setColorScheme: (requested: unknown) => {
          nativeAppearance.setColorScheme(requested as string);
          return requested;
        },
      },
    ],
    [
      ">=0.85.3",
      {
        handBack: "unspecified",
        setColorScheme: (requested: unknown) => {
          nativeAppearance.setColorScheme(requested as string);
          return requested === "unspecified"
            ? (nativeAppearance.getColorScheme() ?? requested)
            : requested;
        },
      },
    ],
  ]);

  const readRule = (name: string): CacheWriteRule => {
    const rule = cacheWriteRules.get(name);
    if (rule === undefined) {
      throw new Error(`No cache-write rule named ${name}`);
    }
    return rule;
  };

  let activeRule = ">=0.85.3";

  const eventEmitter = new EventEmitter();
  let appearance: { colorScheme: unknown } | undefined;

  new NativeEventEmitter(nativeAppearance).addListener(
    "appearanceChanged",
    (newAppearance) => {
      appearance = { colorScheme: newAppearance.colorScheme };
      eventEmitter.emit("change", appearance);
    },
  );

  return {
    addChangeListener: (
      listener: (payload: { colorScheme: unknown }) => void,
    ) => eventEmitter.addListener("change", listener),
    getColorScheme: () => {
      appearance ??= { colorScheme: nativeAppearance.getColorScheme() };
      return appearance.colorScheme;
    },
    setColorScheme: (requested: unknown) => {
      appearance = {
        colorScheme: readRule(activeRule).setColorScheme(requested),
      };
    },

    cacheWriteRuleNames: () => [...cacheWriteRules.keys()],
    handBackFor: (rule: string) => readRule(rule).handBack,
    useCacheWriteRule: (rule: string) => {
      activeRule = rule;
    },
    resetDeviceTo: (scheme: string) => {
      operatingSystemScheme = scheme;
      appliedScheme = scheme;
      pendingRequest = undefined;
      appearance = { colorScheme: scheme };
    },
    applyPendingWrite: () => {
      const before = appliedScheme;
      if (pendingRequest !== undefined) {
        appliedScheme =
          pendingRequest === "unspecified"
            ? operatingSystemScheme
            : pendingRequest;
        pendingRequest = undefined;
      }
      return { applied: appliedScheme, emits: appliedScheme !== before };
    },
  };
});

interface CacheRuleSeams {
  cacheWriteRuleNames: () => string[];
  handBackFor: (rule: string) => ColorSchemeName | null;
  useCacheWriteRule: (rule: string) => void;
  resetDeviceTo: (scheme: string) => void;
  applyPendingWrite: () => { applied: string; emits: boolean };
}

const {
  cacheWriteRuleNames,
  handBackFor,
  useCacheWriteRule,
  resetDeviceTo,
  applyPendingWrite,
} = jest.requireMock<typeof Appearance & CacheRuleSeams>(
  "react-native/Libraries/Utilities/Appearance",
);

const emitAppearanceChanged = (scheme: string): void => {
  const { DeviceEventEmitter } = jest.requireActual<{
    DeviceEventEmitter: { emit: (event: string, payload: unknown) => void };
  }>("react-native");

  DeviceEventEmitter.emit("appearanceChanged", { colorScheme: scheme });
};

const settleEverythingOn = (scheme: string): void => {
  act(() => {
    resetDeviceTo(scheme);
    emitAppearanceChanged(scheme);
  });
};

const DARK_CONDITIONAL_CSS = `
.my-class { color: green; }

@media (prefers-color-scheme: light) {
  .my-class { color: blue; }
}

@media (prefers-color-scheme: dark) {
  .my-class { color: red; }
}`;

const BLUE = { color: "#00f" } as const;
const RED = { color: "#f00" } as const;

const { setColorScheme: setColorSchemeThroughAppearance } = jest.requireMock<{
  setColorScheme: (requested: unknown) => void;
}>("react-native/Libraries/Utilities/Appearance");

// Only the band that caches a request leaves JS without the OS scheme, so it falls back to light (MQ5 §12.5)
const schemeAfterDirectHandBack: Readonly<Record<string, "light" | "dark">> = {
  "<=0.81.5": "dark",
  "0.82.0-0.84.1": "light",
  ">=0.85.3": "dark",
};

const ruleNames = cacheWriteRuleNames();

test("the cache-write census is not empty", () => {
  expect(ruleNames.length).toBeGreaterThan(0);
});

describe.each(ruleNames)("react-native %s", (rule) => {
  beforeEach(() => {
    useCacheWriteRule(rule);
    settleEverythingOn("dark");
  });

  test("the fixture starts with every layer on the dark system scheme", () => {
    expect(Appearance.getColorScheme()).toBe("dark");
    expect(colorScheme.get()).toBe("dark");
  });

  test("a follow-the-system request leaves colorScheme.get() on the OS scheme", () => {
    act(() => {
      colorScheme.set(handBackFor(rule));
    });

    expect(colorScheme.get()).toBe("dark");
  });

  test("a follow-the-system request leaves the class layer on the OS scheme", () => {
    registerCSS(DARK_CONDITIONAL_CSS);
    render(<View testID={testID} className="my-class" />);

    act(() => {
      colorScheme.set(handBackFor(rule));
    });

    expect(screen.getByTestId(testID).props.style).toStrictEqual(RED);
  });

  test("a follow-the-system request leaves Appearance answering a scheme", () => {
    act(() => {
      colorScheme.set(handBackFor(rule));
    });

    expect(["light", "dark"]).toContain(Appearance.getColorScheme());
  });

  test("no platform echo arrives to repair it, because the resolved scheme never changed", () => {
    act(() => {
      colorScheme.set(handBackFor(rule));
    });

    act(() => {
      const { applied, emits } = applyPendingWrite();

      expect(applied).toBe("dark");
      expect(emits).toBe(false);
    });

    expect(colorScheme.get()).toBe("dark");
  });

  test("a follow-the-system request made through Appearance leaves both layers on one scheme", () => {
    registerCSS(DARK_CONDITIONAL_CSS);
    render(<View testID={testID} className="my-class" />);

    act(() => {
      setColorSchemeThroughAppearance(handBackFor(rule));
      colorSchemeObservable.set(null);
    });

    const expected = schemeAfterDirectHandBack[rule];
    expect(colorScheme.get()).toBe(expected);
    expect(screen.getByTestId(testID).props.style).toStrictEqual(
      expected === "dark" ? RED : BLUE,
    );
  });
});
