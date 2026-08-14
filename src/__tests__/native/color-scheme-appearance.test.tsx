import { Appearance, type ColorSchemeName } from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

// A stand-in for Appearance, matching react-native/Libraries/Utilities/Appearance.js:
// getColorScheme reads a process-lifetime cache and setColorScheme writes it. Under the
// jest preset the real module is the absent-native branch, where every read is null and
// setColorScheme is a no-op, so it cannot express this
type ChangeListener = (event: { colorScheme: ColorSchemeName }) => void;

interface FakeAppearance {
  getColorScheme: () => ColorSchemeName;
  setColorScheme: (scheme: ColorSchemeName) => void;
  addChangeListener: (listener: ChangeListener) => { remove: () => void };
  emitOperatingSystemChange: (scheme: ColorSchemeName) => void;
}

jest.mock("react-native", () => {
  const ReactNative = jest.requireActual("react-native");

  let cachedScheme: ColorSchemeName = "light";
  const listeners = new Set<ChangeListener>();

  const fakeAppearance: FakeAppearance = {
    getColorScheme: () => cachedScheme,
    setColorScheme: (scheme) => {
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
  };

  Object.defineProperty(ReactNative, "Appearance", {
    configurable: true,
    get: () => fakeAppearance,
  });

  return ReactNative as unknown;
});

const appearance = Appearance as unknown as FakeAppearance;

const DARK_SCHEME_CSS = `
.my-class { color: blue; }

@media (prefers-color-scheme: dark) {
  .my-class { color: red; }
}`;

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

  expect(colorScheme.get()).toBe("dark");
  expect(appearance.getColorScheme()).toBe("dark");

  act(() => {
    colorScheme.set("light");
  });

  expect(colorScheme.get()).toBe("light");
  expect(appearance.getColorScheme()).toBe("light");
});

test("colorScheme.set repaints a mounted element", () => {
  registerCSS(DARK_SCHEME_CSS);

  render(<View testID={testID} className="my-class" />);
  expect(screen.getByTestId(testID).props.style).toStrictEqual(BLUE);

  act(() => {
    colorScheme.set("dark");
  });

  expect(screen.getByTestId(testID).props.style).toStrictEqual(RED);
});

test("an OS change event still repaints a mounted element", () => {
  registerCSS(DARK_SCHEME_CSS);

  render(<View testID={testID} className="my-class" />);
  expect(screen.getByTestId(testID).props.style).toStrictEqual(BLUE);

  act(() => {
    appearance.emitOperatingSystemChange("dark");
  });

  expect(screen.getByTestId(testID).props.style).toStrictEqual(RED);
});
