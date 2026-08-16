import { Appearance, type ColorSchemeName } from "react-native";

import { act } from "@testing-library/react-native";
import { colorScheme } from "react-native-css/runtime";

// react-native 0.82 rewrote the one expression the announcement used to read:
// `setColorScheme` stopped reading the cache back and wrote the REQUESTED
// value instead. By 0.85.3 a read-back had returned for the literal
// "unspecified" alone — the shape quoted here, and the one 0.86.0 ships:
//
//   NativeAppearance.setColorScheme(colorScheme);
//   state.appearance = {
//     colorScheme:
//       colorScheme === 'unspecified'
//         ? (NativeAppearance.getColorScheme() ?? colorScheme)
//         : colorScheme,
//   };
//     — react-native 0.86.0, Libraries/Utilities/Appearance.js
//
// The 0.81.4 pinned in this repo reads the cache back on every path. The rest
// of the distance to the shape above is 0.82.0, in one release rather than
// spread across the range: `toColorScheme` and its invariant were deleted, and
// `Libraries/Utilities/Appearance.d.ts` re-declared `ColorSchemeName` from
// 'light' | 'dark' | null | undefined to 'light' | 'dark' | 'unspecified'. So
// from 0.82 on, "unspecified" is the type-legal way to hand the scheme back and
// `null` is not in the type at all.
//
// `react-native >= 0.81` is the declared peer range, so the 0.81 shape and the
// 0.86 shape are both shipping and no single installed react-native can express
// both. The two sibling suites drive the installed module; this one stands in
// for the current release, transcribing the four functions of Appearance.js and
// nothing else — the `appearanceChanged` registration is still react-native's
// own `NativeEventEmitter`, so what reaches this cache is what reaches the real
// one.
//
// Neither shape is the whole range. `color-scheme-appearance-cache-rules.test.tsx`
// carries the census of all three cache-write rules, including the
// 0.82.0-0.84.1 one that neither this file nor the installed module can reach.

// Declared out here because babel's `jest.mock` hoist check reads a parameter
// name inside an inline constructor type as a variable access
interface AppearancePreferences {
  colorScheme: ColorSchemeName;
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

jest.mock("react-native/Libraries/Utilities/Appearance", () => {
  const NativeEventEmitter = jest.requireActual<{ default: unknown }>(
    "react-native/Libraries/EventEmitter/NativeEventEmitter",
  ).default as NativeEventEmitterConstructor;
  const EventEmitter = jest.requireActual<{ default: unknown }>(
    "react-native/Libraries/vendor/emitter/EventEmitter",
  ).default as AppearanceEmitterConstructor;

  // The platform applies the write on a later turn and answers from the
  // configuration in force until it does — Android posts the night-mode switch
  // to the UI thread, iOS never assigns `_currentColorScheme` in the setter.
  const operatingSystemScheme: ColorSchemeName = "light";
  let appliedScheme: ColorSchemeName = operatingSystemScheme;
  let pendingRequest: string | undefined;

  const nativeAppearance = {
    addListener: () => undefined,
    getColorScheme: () => appliedScheme,
    removeListeners: () => undefined,
    setColorScheme: (next: string) => {
      pendingRequest = next;
    },
  };

  const eventEmitter = new EventEmitter();
  let appearance: AppearancePreferences | undefined;

  new NativeEventEmitter(nativeAppearance).addListener(
    "appearanceChanged",
    (newAppearance) => {
      appearance = { colorScheme: newAppearance.colorScheme };
      eventEmitter.emit("change", appearance);
    },
  );

  return {
    addChangeListener: (listener: (payload: AppearancePreferences) => void) =>
      eventEmitter.addListener("change", listener),
    getColorScheme: () => {
      appearance ??= { colorScheme: nativeAppearance.getColorScheme() };
      return appearance.colorScheme;
    },
    setColorScheme: (requested: ColorSchemeName) => {
      nativeAppearance.setColorScheme(requested as string);
      appearance = {
        colorScheme:
          (requested as string) === "unspecified"
            ? (nativeAppearance.getColorScheme() ?? requested)
            : requested,
      };
    },
    // The UI-thread post landing. Answers with the scheme now in force, which is
    // what the platform then echoes on `appearanceChanged`.
    applyPendingWrite: () => {
      if (pendingRequest !== undefined) {
        appliedScheme =
          pendingRequest === "unspecified"
            ? operatingSystemScheme
            : (pendingRequest as ColorSchemeName);
        pendingRequest = undefined;
      }
      return appliedScheme;
    },
    writeDeviceScheme: (next: ColorSchemeName) => {
      appliedScheme = next;
      pendingRequest = undefined;
    },
  };
});

interface Rn086Appearance {
  applyPendingWrite: () => ColorSchemeName;
  writeDeviceScheme: (next: ColorSchemeName) => void;
}

const { applyPendingWrite, writeDeviceScheme } = jest.requireMock<
  typeof Appearance & Rn086Appearance
>("react-native/Libraries/Utilities/Appearance");

// react-native 0.86's ColorSchemeName carries "unspecified" where 0.81 carried
// null, and `colorScheme.set` is typed by whichever one is installed. Under this
// repo's 0.81 pin the literal is outside the type, so reaching it needs the
// bridge — the call itself is what a caller on the current release writes.
const setColorScheme086 = colorScheme.set as (value: string) => void;

const emitAppearanceChanged = (scheme: ColorSchemeName): void => {
  // Where the platform's own event arrives — the emitter NativeEventEmitter
  // registered the handler on
  const { DeviceEventEmitter } = jest.requireActual<{
    DeviceEventEmitter: { emit: (event: string, payload: unknown) => void };
  }>("react-native");

  DeviceEventEmitter.emit("appearanceChanged", { colorScheme: scheme });
};

const applyAndEchoPlatformWrite = (): void => {
  emitAppearanceChanged(applyPendingWrite());
};

const recordChangeEvents = (): {
  heard: ColorSchemeName[];
  stop: () => void;
} => {
  const heard: ColorSchemeName[] = [];
  const subscription = Appearance.addChangeListener((event) => {
    heard.push(event.colorScheme);
  });

  return {
    heard,
    stop: () => {
      subscription.remove();
    },
  };
};

beforeEach(() => {
  // Reset through the platform path, so the fixture does not depend on the
  // setter under test
  act(() => {
    writeDeviceScheme("light");
    emitAppearanceChanged("light");
  });
});

test("colorScheme.set announces the requested scheme once", () => {
  const { heard, stop } = recordChangeEvents();

  act(() => {
    colorScheme.set("dark");
  });

  expect(heard).toStrictEqual(["dark"]);
  expect(Appearance.getColorScheme()).toBe("dark");
  expect(colorScheme.get()).toBe("dark");

  act(() => {
    applyAndEchoPlatformWrite();
  });

  // A platform that echoes the write back delivers the same value a second
  // time, and every reader settles on the scheme that was asked for
  expect(heard).toStrictEqual(["dark", "dark"]);
  expect(Appearance.getColorScheme()).toBe("dark");

  stop();
});

test("set(null) hands the scheme back without broadcasting a null scheme", () => {
  act(() => {
    colorScheme.set("dark");
    applyAndEchoPlatformWrite();
  });

  const { heard, stop } = recordChangeEvents();

  act(() => {
    colorScheme.set(null);
  });

  // 0.86 caches the requested value as-is, so the cache goes null on this call
  // and an announcement derived from it broadcasts `{colorScheme: null}` to
  // every subscriber — telling useColorScheme() the app has no scheme. The
  // caller named no scheme, so there is nothing truthful to announce.
  expect(heard).toStrictEqual([]);

  // What the platform makes of a null request is not modelled: 0.86 forwards it
  // to the native module unchanged, where the spec's ColorSchemeName is
  // 'light' | 'dark' | 'unspecified' and null is not a member. The next test
  // covers the spelling 0.86's own type asks for. What matters here is that the
  // channel is intact — an OS change still reaches every reader.
  act(() => {
    writeDeviceScheme("light");
    emitAppearanceChanged("light");
  });

  expect(heard).toStrictEqual(["light"]);
  expect(colorScheme.get()).toBe("light");

  stop();
});

test("set('unspecified') hands the scheme back without broadcasting the literal", () => {
  act(() => {
    colorScheme.set("dark");
    applyAndEchoPlatformWrite();
  });

  const { heard, stop } = recordChangeEvents();

  act(() => {
    setColorScheme086("unspecified");
  });

  // The same hand-back, spelled the way 0.86's type requires. "unspecified" is
  // a request, never a scheme: broadcasting it puts a value in the cache that
  // no `prefers-color-scheme` reader can match, and on 0.81 it trips
  // `toColorScheme`'s invariant outright.
  expect(heard).toStrictEqual([]);

  act(() => {
    applyAndEchoPlatformWrite();
  });

  expect(heard).toStrictEqual(["light"]);
  expect(colorScheme.get()).toBe("light");

  stop();
});

test("a redundant set of the scheme already in force announces nothing", () => {
  act(() => {
    colorScheme.set("dark");
    applyAndEchoPlatformWrite();
  });

  const { heard, stop } = recordChangeEvents();

  act(() => {
    colorScheme.set("dark");
  });

  expect(heard).toStrictEqual([]);

  stop();
});

test("set('unspecified') resolves to a renderable scheme before the platform echoes", () => {
  act(() => {
    colorScheme.set("dark");
    applyAndEchoPlatformWrite();
  });

  act(() => {
    setColorScheme086("unspecified");
  });

  // No echo yet. The test above steps straight past this window, which is why
  // nothing caught the leak: "unspecified" is a REQUEST to follow the system,
  // never a scheme, and the resolution chain totalizes on NULLISHNESS, so the
  // literal passes through every `??` untouched.
  //
  // A reader handed it matches neither `prefers-color-scheme: dark` nor
  // `: light`, so every scheme-conditional class goes dead rather than falling
  // back — the app asks to follow a dark system and loses its dark styling.
  // On Android nothing repairs it until the user toggles the system theme,
  // because AppearanceModule only emits when the RESOLVED scheme changes.
  expect(colorScheme.get()).not.toBe("unspecified");
  expect(["dark", "light"]).toContain(colorScheme.get());
});
