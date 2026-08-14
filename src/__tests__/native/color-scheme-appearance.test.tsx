import { Appearance, type ColorSchemeName } from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

// A stand-in for Appearance, matching react-native/Libraries/Utilities/Appearance.js:
// getColorScheme reads a process-lifetime cache and setColorScheme writes it. Under the
// jest preset the real module is the absent-native branch, where every read is null and
// setColorScheme is a no-op, so it cannot express this.
//
// It cannot reach useColorScheme, and no fake can: react-native/jest/setup.js:122 replaces
// that hook with jest.fn(() => "light"), and the real one imports { getColorScheme } from
// ./Appearance directly rather than through the namespace object replaced below. So the
// claim that RN's own readers now agree is argued from Appearance's semantics, not tested.
type ChangeListener = (event: { colorScheme: ColorSchemeName }) => void;

interface FakeAppearance {
  getColorScheme: () => ColorSchemeName;
  setColorScheme: (scheme: ColorSchemeName) => void;
  addChangeListener: (listener: ChangeListener) => { remove: () => void };
  emitOperatingSystemChange: (scheme: ColorSchemeName) => void;
  readSetCalls: () => ColorSchemeName[];
}

jest.mock("react-native", () => {
  const ReactNative = jest.requireActual("react-native");

  let cachedScheme: ColorSchemeName = "light";
  const setCalls: ColorSchemeName[] = [];
  const listeners = new Set<ChangeListener>();

  const fakeAppearance: FakeAppearance = {
    getColorScheme: () => cachedScheme,
    setColorScheme: (scheme) => {
      setCalls.push(scheme);
      cachedScheme = scheme;
    },
    addChangeListener: (listener) => {
      listeners.add(listener);
      return {
        remove: () => {
          listeners.delete(listener);
        },
      };
    },
    emitOperatingSystemChange: (scheme) => {
      cachedScheme = scheme;
      for (const listener of listeners) {
        listener({ colorScheme: scheme });
      }
    },
    readSetCalls: () => setCalls,
  };

  Object.defineProperty(ReactNative, "Appearance", {
    configurable: true,
    get: () => fakeAppearance,
  });

  return ReactNative as unknown;
});

const appearance = Appearance as unknown as FakeAppearance;

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
  appearance.setColorScheme("light");
});

test("colorScheme.set writes through to Appearance, so both readers agree", () => {
  // useColorScheme() reads Appearance, the class layer reads the observable — one
  // writer has to move both
  act(() => {
    colorScheme.set("dark");
  });

  // The argument, not just the resulting cache: without the write-through the cache
  // would still read "light" here, but so would a fix that passed the wrong value
  expect(appearance.readSetCalls().at(-1)).toBe("dark");
  expect(appearance.getColorScheme()).toBe("dark");

  act(() => {
    colorScheme.set("light");
  });

  expect(appearance.readSetCalls().at(-1)).toBe("light");
  expect(appearance.getColorScheme()).toBe("light");
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

  expect(appearance.readSetCalls().at(-1)).toBeNull();
  expect(appearance.getColorScheme()).toBeNull();
  expect(colorScheme.get()).toBe("light");
});

test("an OS change event repaints a mounted element", () => {
  // Guards Appearance.addChangeListener in reactivity.ts, which nothing else covers —
  // not this change, which does not touch it
  registerCSS(TRI_STATE_CSS);

  render(<View testID={testID} className="my-class" />);
  expect(screen.getByTestId(testID).props.style).toStrictEqual(BLUE);

  act(() => {
    appearance.emitOperatingSystemChange("dark");
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
