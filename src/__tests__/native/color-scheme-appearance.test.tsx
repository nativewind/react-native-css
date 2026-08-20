import { useSyncExternalStore } from "react";
import {
  Appearance,
  DeviceEventEmitter,
  Text,
  type ColorSchemeName,
} from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

// Under the jest preset TurboModuleRegistry.get("Appearance") is null, so
// react-native's Appearance takes its absent-native branch: every read is null,
// setColorScheme is a no-op and no `appearanceChanged` listener is registered.
//
// Faking that ONE module — rather than replacing Appearance itself — leaves the
// real Libraries/Utilities/Appearance.js running, so the cache, the change
// event, the `unspecified` coercion and their ordering are react-native's own
// rather than a transcription of them. That matters here specifically: the
// behaviour under test is which of Appearance's two write paths emits.
jest.mock("react-native/Libraries/Utilities/NativeAppearance", () => {
  let deviceScheme: ColorSchemeName = "light";
  const setColorSchemeCalls: string[] = [];

  return {
    __esModule: true,
    default: {
      // NativeEventEmitter's listener-refcount contract
      addListener: () => undefined,
      getColorScheme: () => deviceScheme,
      readSetColorSchemeCalls: () => [...setColorSchemeCalls],
      removeListeners: () => undefined,
      setColorScheme: (next: string) => {
        setColorSchemeCalls.push(next);
        // The platform resolves "unspecified" to whatever it is following. With
        // no OS behind this fake, that is nothing.
        deviceScheme =
          next === "unspecified" ? null : (next as ColorSchemeName);
      },
      writeDeviceScheme: (next: ColorSchemeName) => {
        deviceScheme = next;
      },
    },
  };
});

interface FakeNativeAppearance {
  readSetColorSchemeCalls: () => string[];
  writeDeviceScheme: (next: ColorSchemeName) => void;
}

const nativeAppearanceModule: { default: FakeNativeAppearance } =
  jest.requireMock("react-native/Libraries/Utilities/NativeAppearance");
const nativeAppearance = nativeAppearanceModule.default;

// What an OS theme change is: the native module's own state moves, then it
// emits `appearanceChanged`. Appearance.js registers the listener that turns
// that event into its cache write and its `change` emit.
const emitOperatingSystemChange = (scheme: ColorSchemeName): void => {
  nativeAppearance.writeDeviceScheme(scheme);
  DeviceEventEmitter.emit("appearanceChanged", { colorScheme: scheme });
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

// Three-way, so "matched neither branch" is distinguishable from "matched light"
const TRI_STATE_CSS = `
.my-class { color: green; }

@media (prefers-color-scheme: light) {
  .my-class { color: blue; }
}

@media (prefers-color-scheme: dark) {
  .my-class { color: red; }
}`;

const GREEN = { color: "#008000" } as const;
const BLUE = { color: "#00f" } as const;
const RED = { color: "#f00" } as const;

beforeEach(() => {
  // Reset through the platform path, so the fixture does not depend on the
  // setter under test
  act(() => {
    emitOperatingSystemChange("light");
  });
});

test("colorScheme.set writes through to Appearance, so both readers agree", () => {
  // useColorScheme() reads Appearance, the class layer reads the observable — one
  // writer has to move both
  act(() => {
    colorScheme.set("dark");
  });

  // The argument, not just the resulting cache: without the write-through the cache
  // would still read "light" here, but so would a fix that passed the wrong value
  expect(nativeAppearance.readSetColorSchemeCalls().at(-1)).toBe("dark");
  expect(Appearance.getColorScheme()).toBe("dark");

  act(() => {
    colorScheme.set("light");
  });

  expect(nativeAppearance.readSetColorSchemeCalls().at(-1)).toBe("light");
  expect(Appearance.getColorScheme()).toBe("light");
});

test("colorScheme.set notifies Appearance's subscribers, not just its cache", () => {
  // The write-through moves getColorScheme() and nothing else: RN's
  // setColorScheme assigns the cache and calls the native module, and the only
  // eventEmitter.emit("change") in Appearance.js is inside the native
  // `appearanceChanged` handler. So a write the platform does not echo back
  // moves the direct read and tells no subscriber.
  const heard: ColorSchemeName[] = [];
  const subscription = Appearance.addChangeListener((event) => {
    heard.push(event.colorScheme);
  });

  act(() => {
    colorScheme.set("dark");
  });

  expect(Appearance.getColorScheme()).toBe("dark");
  expect(heard).toStrictEqual(["dark"]);

  act(() => {
    colorScheme.set("light");
  });

  expect(heard).toStrictEqual(["dark", "light"]);

  subscription.remove();
});

test("a colorScheme.set to the scheme already in force announces nothing", () => {
  // The announcement reports a change and never invents one. Same guard that
  // keeps it silent where there is no native Appearance module to move, and
  // the same equality the observable's own set applies
  const heard: ColorSchemeName[] = [];
  const subscription = Appearance.addChangeListener((event) => {
    heard.push(event.colorScheme);
  });

  act(() => {
    colorScheme.set("light");
  });

  expect(Appearance.getColorScheme()).toBe("light");
  expect(heard).toStrictEqual([]);

  subscription.remove();
});

test("a reader subscribed the way useColorScheme is moves with colorScheme.set", () => {
  render(<SubscribedColorScheme />);
  expect(readSubscribedColorScheme()).toBe("light");

  act(() => {
    colorScheme.set("dark");
  });

  // Without the notification this reads "light" while Appearance.getColorScheme()
  // already answers "dark" — the cache moved and the store was never told to
  // re-read it
  expect(readSubscribedColorScheme()).toBe("dark");
});

test("the class layer and a subscribed reader agree after one colorScheme.set", () => {
  registerCSS(TRI_STATE_CSS);
  render(
    <>
      <View testID={testID} className="my-class" />
      <SubscribedColorScheme />
    </>,
  );

  act(() => {
    colorScheme.set("dark");
  });

  // The split this API exists to prevent: a `dark:` utility and a subscribed
  // colour prop rendering different schemes in one tree
  expect(screen.getByTestId(testID).props.style).toStrictEqual(RED);
  expect(readSubscribedColorScheme()).toBe("dark");
  expect(colorScheme.get()).toBe("dark");
});

test("the class layer resolves the scheme the same way colorScheme.get() does", () => {
  // The observable holds null at rest and after set(null). Reading it raw leaves every
  // prefers-color-scheme query unmatched while get() reports a definite scheme, which is
  // the same two-readers-disagree defect one function along
  registerCSS(TRI_STATE_CSS);
  render(<View testID={testID} className="my-class" />);

  act(() => {
    colorScheme.set(null);
  });

  expect(colorScheme.get()).toBe("light");
  expect(screen.getByTestId(testID).props.style).toStrictEqual(BLUE);
});

test("set(null) hands the scheme back to Appearance", () => {
  act(() => {
    colorScheme.set("dark");
  });

  act(() => {
    colorScheme.set(null);
  });

  // "unspecified" is what RN's setColorScheme sends the platform for null
  expect(nativeAppearance.readSetColorSchemeCalls().at(-1)).toBe("unspecified");
  expect(Appearance.getColorScheme()).toBeNull();
  expect(colorScheme.get()).toBe("light");
});

test("an OS change event repaints a mounted element", () => {
  // Guards Appearance.addChangeListener in reactivity.ts, which nothing else covers —
  // not this change, which does not touch it
  registerCSS(TRI_STATE_CSS);

  render(<View testID={testID} className="my-class" />);
  expect(screen.getByTestId(testID).props.style).toStrictEqual(BLUE);

  act(() => {
    emitOperatingSystemChange("dark");
  });

  expect(screen.getByTestId(testID).props.style).toStrictEqual(RED);
});

test("a scheme the runtime cannot resolve matches no prefers-color-scheme query", () => {
  // The unconditional rule is the floor. If both queries ever matched at once, or the
  // fallback above silently picked a side on a platform that reports nothing, this is
  // what would catch it
  registerCSS(`.my-class { color: green; }`);
  render(<View testID={testID} className="my-class" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual(GREEN);
});
