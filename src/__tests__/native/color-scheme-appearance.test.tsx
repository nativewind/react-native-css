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

type Scheme = "light" | "dark";
type Platform = "ios" | "android";

// A device applies an override after the call returns and sends appearanceChanged only when its scheme moves, as RCTAppearance and AppearanceModule do
jest.mock("react-native/Libraries/Utilities/NativeAppearance", () => {
  let platform = "ios";
  let systemScheme = "light";
  let override: string | null = null;
  let sentScheme = "light";
  let pendingOverrides: string[] = [];
  let setColorSchemeCalls: string[] = [];

  const schemeInForce = () => override ?? systemScheme;
  const sendIfMoved = (sent: string[]) => {
    if (schemeInForce() !== sentScheme) {
      sentScheme = schemeInForce();
      sent.push(sentScheme);
    }
  };

  return {
    __esModule: true,
    default: {
      addListener: () => undefined,
      removeListeners: () => undefined,
      // RCTAppearance answers the scheme it last sent; AppearanceModule reads the configuration in force
      getColorScheme: () => (platform === "ios" ? sentScheme : schemeInForce()),
      setColorScheme: (next: string) => {
        setColorSchemeCalls.push(next);
        pendingOverrides.push(next);
      },
      startDevice: (nextPlatform: string, scheme: string) => {
        platform = nextPlatform;
        systemScheme = scheme;
        override = null;
        sentScheme = scheme;
        pendingOverrides = [];
        setColorSchemeCalls = [];
      },
      // iOS applies the overrides of one main-queue turn together; Android applies each posted override in turn
      applyPendingOverrides: (): string[] => {
        const applied =
          platform === "ios" ? pendingOverrides.slice(-1) : pendingOverrides;
        pendingOverrides = [];
        const sent: string[] = [];
        for (const next of applied) {
          override = next === "unspecified" || next === "auto" ? null : next;
          sendIfMoved(sent);
        }
        return sent;
      },
      changeSystemScheme: (scheme: string): string[] => {
        systemScheme = scheme;
        const sent: string[] = [];
        sendIfMoved(sent);
        return sent;
      },
      readSetColorSchemeCalls: () => [...setColorSchemeCalls],
    },
  };
});

interface DeviceDouble {
  startDevice: (platform: Platform, scheme: Scheme) => void;
  applyPendingOverrides: () => Scheme[];
  changeSystemScheme: (scheme: Scheme) => Scheme[];
  readSetColorSchemeCalls: () => string[];
}

const device = jest.requireMock<{ default: DeviceDouble }>(
  "react-native/Libraries/Utilities/NativeAppearance",
).default;

const deliver = (sent: readonly Scheme[]): readonly Scheme[] => {
  for (const scheme of sent) {
    DeviceEventEmitter.emit("appearanceChanged", { colorScheme: scheme });
  }
  return sent;
};

const subscribeToAppearance = (onStoreChange: () => void): (() => void) => {
  const subscription = Appearance.addChangeListener(onStoreChange);
  return () => {
    subscription.remove();
  };
};

const readAppearance = (): ColorSchemeName | null | undefined =>
  Appearance.getColorScheme();

// The store react-native's useColorScheme builds, which the jest preset replaces with a constant
const SubscribedColorScheme = () => {
  const scheme = useSyncExternalStore(subscribeToAppearance, readAppearance);

  return <Text testID="subscribed-color-scheme">{scheme ?? "unset"}</Text>;
};

const TRI_STATE_CSS = `
.my-class { color: green; }

@media (prefers-color-scheme: light) {
  .my-class { color: blue; }
}

@media (prefers-color-scheme: dark) {
  .my-class { color: red; }
}`;

const STYLE_FOR: Readonly<Record<Scheme, { readonly color: string }>> = {
  light: { color: "#00f" },
  dark: { color: "#f00" },
};

const LATE_TEST_ID = "late-element";

const readEveryLayer = () => ({
  classLayer: screen.getByTestId(testID).props.style,
  colorSchemeGet: colorScheme.get(),
  subscribed: screen.getByTestId("subscribed-color-scheme").props.children,
});

const everyLayerOn = (scheme: Scheme) => ({
  classLayer: STYLE_FOR[scheme],
  colorSchemeGet: scheme,
  subscribed: scheme,
});

const opposite = (scheme: Scheme): Scheme =>
  scheme === "light" ? "dark" : "light";

const expectEveryLayerToAgree = (): void => {
  expect(readEveryLayer()).toStrictEqual(everyLayerOn(colorScheme.get()));
};

const recordAppearanceEvents = (): {
  sentByCaller: () => readonly unknown[];
  stop: () => void;
} => {
  const emit = jest.spyOn(DeviceEventEmitter, "emit");

  return {
    sentByCaller: () =>
      emit.mock.calls.filter(([event]) => event === "appearanceChanged"),
    stop: () => {
      emit.mockRestore();
    },
  };
};

describe.each([
  ["ios", "light"],
  ["ios", "dark"],
  ["android", "light"],
  ["android", "dark"],
] as const)("on %s with a %s system scheme", (platform, system) => {
  const other = opposite(system);

  beforeEach(() => {
    device.startDevice(platform, system);
    act(() => {
      DeviceEventEmitter.emit("appearanceChanged", { colorScheme: system });
    });
    registerCSS(TRI_STATE_CSS);
    render(
      <>
        <View testID={testID} className="my-class" />
        <SubscribedColorScheme />
      </>,
    );
  });

  test("colorScheme.set hands each request to Appearance and sends no event of its own", () => {
    const { sentByCaller, stop } = recordAppearanceEvents();

    act(() => {
      colorScheme.set(other);
      colorScheme.set(null);
      colorScheme.set("unspecified");
    });

    expect(device.readSetColorSchemeCalls().slice(-3)).toStrictEqual([
      other,
      "unspecified",
      "unspecified",
    ]);
    expect(sentByCaller()).toStrictEqual([]);

    stop();
  });

  test("every layer agrees until the platform applies a request, then takes it", () => {
    act(() => {
      colorScheme.set(other);
    });

    expectEveryLayerToAgree();

    act(() => {
      deliver(device.applyPendingOverrides());
    });

    expect(readEveryLayer()).toStrictEqual(everyLayerOn(other));
  });

  test.each([null, "unspecified"] as const)(
    "set(%p) returns every layer to the system scheme",
    (handBack) => {
      act(() => {
        colorScheme.set(other);
      });
      act(() => {
        deliver(device.applyPendingOverrides());
      });
      act(() => {
        colorScheme.set(handBack);
      });
      act(() => {
        deliver(device.applyPendingOverrides());
      });

      expect(readEveryLayer()).toStrictEqual(everyLayerOn(system));
    },
  );

  test("a request and its hand-back made before the platform applies either leave every layer on the system scheme", () => {
    act(() => {
      colorScheme.set(other);
      colorScheme.set(null);
    });

    expectEveryLayerToAgree();

    let sent: readonly Scheme[] = [];
    act(() => {
      sent = deliver(device.applyPendingOverrides());
    });

    expect(sent).toStrictEqual(platform === "ios" ? [] : [other, system]);
    expect(readEveryLayer()).toStrictEqual(everyLayerOn(system));
  });

  test("each scheme the platform applies moves every layer, ending on the last request", () => {
    act(() => {
      colorScheme.set(other);
    });
    act(() => {
      colorScheme.set(system);
    });

    expectEveryLayerToAgree();

    let sent: readonly Scheme[] = [];
    act(() => {
      sent = deliver(device.applyPendingOverrides());
    });

    expect(sent).toStrictEqual(platform === "ios" ? [] : [other, system]);
    expect(readEveryLayer()).toStrictEqual(everyLayerOn(system));
  });

  test("a request for the scheme in force sends nothing and moves no layer", () => {
    act(() => {
      colorScheme.set(system);
    });

    let sent: readonly Scheme[] = [];
    act(() => {
      sent = deliver(device.applyPendingOverrides());
    });

    expect(sent).toStrictEqual([]);
    expect(readEveryLayer()).toStrictEqual(everyLayerOn(system));
  });

  test("a scheme set through Appearance itself moves every layer once the platform applies it", () => {
    act(() => {
      Appearance.setColorScheme(other);
    });
    act(() => {
      deliver(device.applyPendingOverrides());
    });

    expect(readEveryLayer()).toStrictEqual(everyLayerOn(other));
  });

  test("an element mounted before the platform applies a request renders what one mounted earlier renders", () => {
    act(() => {
      colorScheme.set(null);
      Appearance.setColorScheme(other);
    });
    const earlierStyle: unknown = screen.getByTestId(testID).props.style;
    render(<View testID={LATE_TEST_ID} className="my-class" />);

    expect(earlierStyle).toStrictEqual(STYLE_FOR[colorScheme.get()]);
    expect(screen.getByTestId(LATE_TEST_ID).props.style).toStrictEqual(
      earlierStyle,
    );
  });

  test("an OS change moves every layer, and none while a request overrides it", () => {
    act(() => {
      deliver(device.changeSystemScheme(other));
    });

    expect(readEveryLayer()).toStrictEqual(everyLayerOn(other));

    act(() => {
      colorScheme.set(other);
    });
    act(() => {
      deliver(device.applyPendingOverrides());
    });
    act(() => {
      deliver(device.changeSystemScheme(system));
    });

    expect(readEveryLayer()).toStrictEqual(everyLayerOn(other));
  });
});

test("a value Appearance reports that names no scheme resolves to light on both layers", () => {
  device.startDevice("ios", "dark");
  registerCSS(TRI_STATE_CSS);
  render(<View testID={testID} className="my-class" />);

  act(() => {
    colorSchemeObservable.set("unspecified");
  });

  expect(colorScheme.get()).toBe("light");
  expect(screen.getByTestId(testID).props.style).toStrictEqual(STYLE_FOR.light);
});
