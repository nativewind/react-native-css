import { Appearance, type ColorSchemeName } from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

// Declared out here because babel's `jest.mock` hoist check reads a parameter
// name inside an inline constructor type as a variable access
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

// `react-native >= 0.81` is the declared peer range, and across it
// `Appearance.setColorScheme` writes its cache by three different rules. The
// mock below is the census of those three, transcribed from
// Libraries/Utilities/Appearance.js at each boundary, and every test here runs
// against all three rather than against whichever react-native is installed.
//
// The device under all three is the same, and it is the platform both OSes
// actually implement:
//
//   - `NativeAppearance.getColorScheme()` answers the CONFIGURATION IN FORCE,
//     never a request. Android returns `UiModeUtils.isDarkMode(context)`
//     resolved to "dark"/"light"; iOS returns `_currentColorScheme`, assigned
//     at init and in `appearanceChanged:` only. Neither can answer
//     "unspecified".
//   - `NativeAppearance.setColorScheme()` does not apply inline. Android wraps
//     `AppCompatDelegate.setDefaultNightMode` in `UiThreadUtil.runOnUiThread`;
//     iOS's `setColorScheme:` never assigns `_currentColorScheme`.
//   - `appearanceChanged` fires only when the RESOLVED scheme changes —
//     `AppearanceModule.onConfigurationChanged` guards on
//     `lastEmittedColorScheme != newColorScheme`, and `RCTAppearance` guards on
//     `![_currentColorScheme isEqualToString:newColorScheme]`. Re-affirming the
//     scheme already in force emits nothing at all.
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
    // `?ColorSchemeName` in the TurboModule spec — null where there is no
    // native Appearance module at all
    getColorScheme: (): string | null => appliedScheme,
    removeListeners: () => undefined,
    setColorScheme: (next: string) => {
      pendingRequest = next;
    },
  };

  // The census. Each entry is one release band's `setColorScheme` body, and
  // nothing else about that release differs on the path these tests walk.
  const cacheWriteRules = new Map<string, CacheWriteRule>([
    // NativeAppearance.setColorScheme(colorScheme ?? 'unspecified');
    // state.appearance = {colorScheme: toColorScheme(NativeAppearance.getColorScheme())};
    [
      "<=0.81.5",
      {
        // 0.81's Appearance.d.ts declares ColorSchemeName as
        // 'light' | 'dark' | null | undefined, so null is how a caller on this
        // band spells "follow the system"
        handBack: null,
        setColorScheme: (requested: unknown) => {
          nativeAppearance.setColorScheme(
            (requested as string | null) ?? "unspecified",
          );
          return nativeAppearance.getColorScheme();
        },
      },
    ],
    // NativeAppearance.setColorScheme(colorScheme);
    // state.appearance = {colorScheme};
    [
      "0.82.0-0.84.1",
      {
        // 0.82's Appearance.d.ts declares ColorSchemeName as
        // 'light' | 'dark' | 'unspecified' and null leaves the type
        handBack: "unspecified",
        setColorScheme: (requested: unknown) => {
          nativeAppearance.setColorScheme(requested as string);
          return requested;
        },
      },
    ],
    // NativeAppearance.setColorScheme(colorScheme);
    // state.appearance = {colorScheme: colorScheme === 'unspecified'
    //   ? (NativeAppearance.getColorScheme() ?? colorScheme) : colorScheme};
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

    // Test seams — the census, the band selector, and the device
    cacheWriteRuleNames: () => [...cacheWriteRules.keys()],
    handBackFor: (rule: string) => readRule(rule).handBack,
    useCacheWriteRule: (rule: string) => {
      activeRule = rule;
    },
    // The device: the OS preference, the configuration in force, and the JS
    // cache all put back to `scheme`, without going through the setter under
    // test
    resetDeviceTo: (scheme: string) => {
      operatingSystemScheme = scheme;
      appliedScheme = scheme;
      pendingRequest = undefined;
      appearance = { colorScheme: scheme };
    },
    // The UI-thread post landing. Answers with the scheme now in force, and
    // whether the platform would echo it — it only does when that scheme
    // CHANGED.
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
  handBackFor: (rule: string) => ColorSchemeName;
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

// react-native 0.82+ carries "unspecified" where 0.81 carried null, and
// `colorScheme.set` is typed by whichever one is installed. Under this repo's
// 0.81 pin the literal is outside the type, so reaching it needs the bridge —
// the call itself is what a caller on that band writes.
const setColorSchemeAcrossBands = colorScheme.set as (
  value: ColorSchemeName,
) => void;

const emitAppearanceChanged = (scheme: string): void => {
  const { DeviceEventEmitter } = jest.requireActual<{
    DeviceEventEmitter: { emit: (event: string, payload: unknown) => void };
  }>("react-native");

  DeviceEventEmitter.emit("appearanceChanged", { colorScheme: scheme });
};

// Put the whole world — the OS, the configuration in force, react-native's
// cache and react-native-css's observable — on `scheme`, through the platform
// path rather than through the setter under test.
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

const RED = { color: "#f00" } as const;

const ruleNames = cacheWriteRuleNames();

test("the cache-write census is not empty", () => {
  // The vacuity guard: an empty census would make every describe.each below
  // generate no cases and leave this file silently green
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
      setColorSchemeAcrossBands(handBackFor(rule));
    });

    // The user asked to follow the system and the system is dark. What the
    // caller wrote is identical on every band; what they read back must be too
    expect(colorScheme.get()).toBe("dark");
  });

  test("a follow-the-system request leaves the class layer on the OS scheme", () => {
    registerCSS(DARK_CONDITIONAL_CSS);
    render(<View testID={testID} className="my-class" />);

    act(() => {
      setColorSchemeAcrossBands(handBackFor(rule));
    });

    expect(screen.getByTestId(testID).props.style).toStrictEqual(RED);
  });

  test("a follow-the-system request leaves Appearance answering a scheme", () => {
    // Not this library's channel — this is react-native's own cache, which
    // `useColorScheme()` and every store built the documented way read.
    // `colorScheme.set` is the only caller of `Appearance.setColorScheme` here,
    // so whatever this answers afterwards is what the library left in the app's
    // cache for everyone else.
    act(() => {
      setColorSchemeAcrossBands(handBackFor(rule));
    });

    expect(["light", "dark"]).toContain(Appearance.getColorScheme());
  });

  test("no platform echo arrives to repair it, because the resolved scheme never changed", () => {
    act(() => {
      setColorSchemeAcrossBands(handBackFor(rule));
    });

    act(() => {
      const { applied, emits } = applyPendingWrite();

      // Re-affirming the scheme already in force resolves to the same scheme,
      // so neither AppearanceModule nor RCTAppearance emits. Nothing arrives to
      // overwrite a cache left holding a non-scheme; on Android the next event
      // is the user toggling their system theme.
      expect(applied).toBe("dark");
      expect(emits).toBe(false);
    });

    expect(colorScheme.get()).toBe("dark");
  });
});
