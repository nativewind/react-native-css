import { useSyncExternalStore } from "react";
import {
  Appearance,
  DeviceEventEmitter,
  Text,
  type ColorSchemeName,
} from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { colorScheme } from "react-native-css/runtime";

// The platform applies a `setColorScheme` write LATER, and the react-native
// pinned here writes its own cache from a read-back taken before that apply
// lands:
//
//   NativeAppearance.setColorScheme(colorScheme ?? 'unspecified');
//   state.appearance = {colorScheme: toColorScheme(NativeAppearance.getColorScheme())};
//     — react-native 0.81.4, Libraries/Utilities/Appearance.js
//
// Both platforms make that read-back stale. Android's `AppearanceModule`
// wraps the night-mode switch in `UiThreadUtil.runOnUiThread {}`, which is
// `mainHandler.postDelayed(runnable, 0)` — always posted, never inline, so
// `getColorScheme()` still answers from the applied configuration. iOS's
// `RCTAppearance` `getColorScheme` returns `_currentColorScheme`, assigned at
// init and inside `appearanceChanged:`, and never by `setColorScheme:`.
//
// So the fake below records the request and moves nothing. `applyPendingWrite`
// is the seam the UI-thread post stands for: an explicit call rather than a
// timer, so a slow machine cannot change what any test here observes.
//
// The sibling `color-scheme-appearance.test.tsx` applies the write inline,
// which is the shape a caller sees on react-native >= 0.86 — there the cache is
// the requested value. `color-scheme-appearance-rn-0-86.test.tsx` covers the
// rest of that version's setter. Between the three, both cache-write rules in
// the declared peer range (`react-native >= 0.81`) are driven.
jest.mock("react-native/Libraries/Utilities/NativeAppearance", () => {
  // What the OS itself reports, and therefore what "unspecified" resolves to
  const operatingSystemScheme = "light";
  let appliedScheme: ColorSchemeName = operatingSystemScheme;
  let pendingRequest: string | undefined;

  const resolveRequest = (request: string): ColorSchemeName =>
    request === "unspecified"
      ? operatingSystemScheme
      : (request as ColorSchemeName);

  return {
    __esModule: true,
    default: {
      // NativeEventEmitter's listener-refcount contract
      addListener: () => undefined,
      // The scheme in force, which is not the scheme most recently requested
      getColorScheme: () => appliedScheme,
      removeListeners: () => undefined,
      setColorScheme: (next: string) => {
        pendingRequest = next;
      },
      // The UI-thread post landing. Answers with the scheme now in force, which
      // is what the platform then echoes on `appearanceChanged`.
      applyPendingWrite: () => {
        if (pendingRequest !== undefined) {
          appliedScheme = resolveRequest(pendingRequest);
          pendingRequest = undefined;
        }
        return appliedScheme;
      },
      writeDeviceScheme: (next: ColorSchemeName) => {
        appliedScheme = next;
        pendingRequest = undefined;
      },
    },
  };
});

interface FakeNativeAppearance {
  applyPendingWrite: () => ColorSchemeName;
  writeDeviceScheme: (next: ColorSchemeName) => void;
}

const nativeAppearanceModule: { default: FakeNativeAppearance } =
  jest.requireMock("react-native/Libraries/Utilities/NativeAppearance");
const nativeAppearance = nativeAppearanceModule.default;

// The UI-thread post landing, and the `appearanceChanged` event the platform
// then fires. Appearance.js registers the listener that turns that event into
// its cache write and its `change` emit.
const applyAndEchoPlatformWrite = (): void => {
  const applied = nativeAppearance.applyPendingWrite();
  DeviceEventEmitter.emit("appearanceChanged", { colorScheme: applied });
};

// Reset through the platform path, so the fixture does not depend on the setter
// under test
const resetToLight = (): void => {
  nativeAppearance.writeDeviceScheme("light");
  DeviceEventEmitter.emit("appearanceChanged", { colorScheme: "light" });
};

// The shape of react-native's own useColorScheme: subscribe through
// addChangeListener, snapshot through getColorScheme. The real hook cannot be
// used here — react-native/jest/setup.js replaces it with jest.fn(() => "light")
// — but it is this store, and so is every other documented way to track the
// scheme.
const subscribeToAppearance = (onStoreChange: () => void): (() => void) => {
  const subscription = Appearance.addChangeListener(onStoreChange);
  return () => {
    subscription.remove();
  };
};

const readAppearanceColorScheme = (): ColorSchemeName =>
  Appearance.getColorScheme();

const SubscribedColorScheme = () => {
  const scheme = useSyncExternalStore(
    subscribeToAppearance,
    readAppearanceColorScheme,
  );

  return <Text testID="subscribed-color-scheme">{scheme ?? "unset"}</Text>;
};

const readSubscribedColorScheme = (): unknown =>
  screen.getByTestId("subscribed-color-scheme").props.children;

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
  act(() => {
    resetToLight();
  });
});

test("colorScheme.set announces the requested scheme before the platform applies it", () => {
  const { heard, stop } = recordChangeEvents();

  act(() => {
    colorScheme.set("dark");
  });

  // Nothing has been flushed — the platform is still holding the write, so
  // `Appearance.setColorScheme` has cached a read-back of the OLD scheme. An
  // announcement derived from that cache reports no change at all; one carrying
  // the requested value reports the change the caller asked for.
  expect(heard).toStrictEqual(["dark"]);
  expect(Appearance.getColorScheme()).toBe("dark");
  expect(colorScheme.get()).toBe("dark");

  stop();
});

test("a reader subscribed the way useColorScheme is moves before the platform echo", () => {
  render(<SubscribedColorScheme />);
  expect(readSubscribedColorScheme()).toBe("light");

  act(() => {
    colorScheme.set("dark");
  });

  // The whole point of the setter: an app that offers a light/dark preference
  // gets its chrome and its `dark:` utilities on the same scheme in one call,
  // rather than one of them a UI-thread hop later
  expect(readSubscribedColorScheme()).toBe("dark");
});

test("the platform echo that follows repeats the scheme and settles there", () => {
  const { heard, stop } = recordChangeEvents();

  act(() => {
    colorScheme.set("dark");
  });
  act(() => {
    applyAndEchoPlatformWrite();
  });

  // A platform that echoes the write back delivers the same value a second
  // time. useSyncExternalStore bails on an identical snapshot, and every
  // reader here holds the scheme that was asked for.
  expect(heard).toStrictEqual(["dark", "dark"]);
  expect(Appearance.getColorScheme()).toBe("dark");
  expect(colorScheme.get()).toBe("dark");

  stop();
});

test("a redundant set of the scheme the announcement already put in force says nothing", () => {
  act(() => {
    colorScheme.set("dark");
  });

  const { heard, stop } = recordChangeEvents();

  act(() => {
    colorScheme.set("dark");
  });

  // The announcement reaches Appearance's own `appearanceChanged` handler, so
  // the cache it wrote is what the next call reads as the scheme in force. That
  // is what keeps the second call silent without the setter tracking anything
  // of its own.
  expect(heard).toStrictEqual([]);

  stop();
});

test("set(null) hands the scheme back without announcing a scheme of its own", () => {
  act(() => {
    colorScheme.set("dark");
  });

  const { heard, stop } = recordChangeEvents();

  act(() => {
    colorScheme.set(null);
  });

  // There is nothing truthful to announce: the caller named no scheme, and only
  // the OS knows what handing it back resolves to. `null` is not a scheme any
  // reader can render — broadcasting it tells useColorScheme() the app has no
  // scheme at all.
  expect(heard).toStrictEqual([]);

  act(() => {
    applyAndEchoPlatformWrite();
  });

  // The platform's own echo is what delivers the resolved scheme, exactly as it
  // does for an OS theme change
  expect(heard).toStrictEqual(["light"]);
  expect(colorScheme.get()).toBe("light");

  stop();
});
