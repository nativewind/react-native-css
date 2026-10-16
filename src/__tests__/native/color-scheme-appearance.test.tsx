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

import { colorScheme as colorSchemeObservable } from "../../native/reactivity";

// A device applies setColorScheme later and always reports the scheme in force, so the fake holds each write until the test applies it
jest.mock("react-native/Libraries/Utilities/NativeAppearance", () => {
  const operatingSystemScheme = "light";
  let appliedScheme: ColorSchemeName = operatingSystemScheme;
  let pendingRequest: string | undefined;
  const setColorSchemeCalls: string[] = [];

  const resolveRequest = (request: string): ColorSchemeName =>
    request === "unspecified"
      ? operatingSystemScheme
      : (request as ColorSchemeName);

  return {
    __esModule: true,
    default: {
      addListener: () => undefined,
      getColorScheme: () => appliedScheme,
      removeListeners: () => undefined,
      setColorScheme: (next: string) => {
        setColorSchemeCalls.push(next);
        pendingRequest = next;
      },
      applyPendingWrite: () => {
        if (pendingRequest !== undefined) {
          appliedScheme = resolveRequest(pendingRequest);
          pendingRequest = undefined;
        }
        return appliedScheme;
      },
      readSetColorSchemeCalls: () => [...setColorSchemeCalls],
      writeDeviceScheme: (next: ColorSchemeName) => {
        appliedScheme = next;
        pendingRequest = undefined;
      },
    },
  };
});

interface FakeNativeAppearance {
  applyPendingWrite: () => ColorSchemeName;
  readSetColorSchemeCalls: () => string[];
  writeDeviceScheme: (next: ColorSchemeName) => void;
}

const nativeAppearanceModule: { default: FakeNativeAppearance } =
  jest.requireMock("react-native/Libraries/Utilities/NativeAppearance");
const nativeAppearance = nativeAppearanceModule.default;

const applyAndEchoPlatformWrite = (): void => {
  const applied = nativeAppearance.applyPendingWrite();
  DeviceEventEmitter.emit("appearanceChanged", { colorScheme: applied });
};

const emitOperatingSystemChange = (scheme: ColorSchemeName): void => {
  nativeAppearance.writeDeviceScheme(scheme);
  DeviceEventEmitter.emit("appearanceChanged", { colorScheme: scheme });
};

const subscribeToAppearance = (onStoreChange: () => void): (() => void) => {
  const subscription = Appearance.addChangeListener(onStoreChange);
  return () => {
    subscription.remove();
  };
};

const readAppearanceColorScheme = (): ReturnType<
  typeof Appearance.getColorScheme
> => Appearance.getColorScheme();

// The store react-native's useColorScheme builds, which the jest preset replaces with a constant
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

const TRI_STATE_CSS = `
.my-class { color: green; }

@media (prefers-color-scheme: light) {
  .my-class { color: blue; }
}

@media (prefers-color-scheme: dark) {
  .my-class { color: red; }
}`;

const BLUE = { color: "#00f" } as const;
const RED = { color: "#f00" } as const;

beforeEach(() => {
  act(() => {
    emitOperatingSystemChange("light");
  });
});

test("colorScheme.set writes through to Appearance", () => {
  act(() => {
    colorScheme.set("dark");
  });

  expect(nativeAppearance.readSetColorSchemeCalls().at(-1)).toBe("dark");
  expect(Appearance.getColorScheme()).toBe("dark");

  act(() => {
    colorScheme.set("light");
  });

  expect(nativeAppearance.readSetColorSchemeCalls().at(-1)).toBe("light");
  expect(Appearance.getColorScheme()).toBe("light");
});

test("colorScheme.set announces the requested scheme before the platform applies it", () => {
  const { heard, stop } = recordChangeEvents();

  act(() => {
    colorScheme.set("dark");
  });

  expect(heard).toStrictEqual(["dark"]);
  expect(Appearance.getColorScheme()).toBe("dark");
  expect(colorScheme.get()).toBe("dark");

  stop();
});

test("the platform echo that follows repeats the scheme and settles there", () => {
  const { heard, stop } = recordChangeEvents();

  act(() => {
    colorScheme.set("dark");
  });
  act(() => {
    applyAndEchoPlatformWrite();
  });

  expect(heard).toStrictEqual(["dark", "dark"]);
  expect(Appearance.getColorScheme()).toBe("dark");
  expect(colorScheme.get()).toBe("dark");

  stop();
});

test("a colorScheme.set to the scheme already in force announces nothing", () => {
  const { heard, stop } = recordChangeEvents();

  act(() => {
    colorScheme.set("light");
  });

  expect(Appearance.getColorScheme()).toBe("light");
  expect(heard).toStrictEqual([]);

  stop();
});

test("a repeated colorScheme.set announces nothing the second time", () => {
  act(() => {
    colorScheme.set("dark");
  });

  const { heard, stop } = recordChangeEvents();

  act(() => {
    colorScheme.set("dark");
  });

  expect(heard).toStrictEqual([]);

  stop();
});

test("a reader subscribed the way useColorScheme is moves with colorScheme.set", () => {
  render(<SubscribedColorScheme />);
  expect(readSubscribedColorScheme()).toBe("light");

  act(() => {
    colorScheme.set("dark");
  });

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

  expect(screen.getByTestId(testID).props.style).toStrictEqual(RED);
  expect(readSubscribedColorScheme()).toBe("dark");
  expect(colorScheme.get()).toBe("dark");
});

test("the class layer resolves the scheme the same way colorScheme.get() does", () => {
  registerCSS(TRI_STATE_CSS);
  render(<View testID={testID} className="my-class" />);

  act(() => {
    colorScheme.set(null);
  });

  expect(colorScheme.get()).toBe("light");
  expect(screen.getByTestId(testID).props.style).toStrictEqual(BLUE);
});

test.each([null, "unspecified"] as const)(
  "set(%p) hands the scheme back without announcing a scheme of its own",
  (handBack) => {
    act(() => {
      colorScheme.set("dark");
    });

    const { heard, stop } = recordChangeEvents();

    act(() => {
      colorScheme.set(handBack);
    });

    expect(nativeAppearance.readSetColorSchemeCalls().at(-1)).toBe(
      "unspecified",
    );
    expect(heard).toStrictEqual([]);

    act(() => {
      applyAndEchoPlatformWrite();
    });

    expect(heard).toStrictEqual(["light"]);
    expect(colorScheme.get()).toBe("light");

    stop();
  },
);

test("a held follow-the-system request renders the scheme Appearance reports on both layers", () => {
  registerCSS(TRI_STATE_CSS);
  render(<View testID={testID} className="my-class" />);

  act(() => {
    colorSchemeObservable.set("unspecified");
  });

  expect(colorScheme.get()).toBe("light");
  expect(screen.getByTestId(testID).props.style).toStrictEqual(BLUE);
});

test("an OS change event repaints a mounted element", () => {
  registerCSS(TRI_STATE_CSS);

  render(<View testID={testID} className="my-class" />);
  expect(screen.getByTestId(testID).props.style).toStrictEqual(BLUE);

  act(() => {
    emitOperatingSystemChange("dark");
  });

  expect(screen.getByTestId(testID).props.style).toStrictEqual(RED);
});
