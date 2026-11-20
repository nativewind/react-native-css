import {
  Appearance,
  type ColorSchemeName as ReactNativeColorSchemeName,
} from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";
import type { ColorSchemeName } from "react-native-css/runtime.types";

import { setAppearanceColorScheme } from "../../color-scheme";

const mockSetColorScheme = jest.fn();

// `Appearance` reads its native module lazily, so mocking the module is enough to make
// the writes observable. Without it `TurboModuleRegistry.get('Appearance')` is null
// under jest and every `setColorScheme` is a silent no-op.
jest.mock("react-native/Libraries/Utilities/NativeAppearance", () => ({
  __esModule: true,
  default: {
    setColorScheme: (scheme: string) => {
      mockSetColorScheme(scheme);
    },
    // `getColorScheme` feeds react-native's own post-write bookkeeping, which asserts
    // the value is a resolved scheme or absent.
    getColorScheme: () => undefined,
    addListener: () => undefined,
    removeListeners: () => undefined,
  },
}));

/*******************************  Compile plane  ******************************/

type Assert<T extends true> = T;
type Covers<Actual, Accepted> = [Actual] extends [Accepted] ? true : false;

type AppearanceChangeColorScheme = Parameters<
  Parameters<typeof Appearance.addChangeListener>[0]
>[0]["colorScheme"];

/**
 * `ColorSchemeName` is react-native-css's own union rather than react-native's, because
 * react-native's changes shape inside this package's peer range: up to 0.85 "follow the
 * system" is `null | undefined`, from 0.86 it is `"unspecified"`.
 *
 * These aliases are read off the installed react-native rather than restating either
 * spelling, so `yarn typecheck` fails at whichever end of the range the checkout is on
 * the moment the package stops covering a value react-native hands it.
 */
export type CoversReactNativeUnion = Assert<
  Covers<ReactNativeColorSchemeName, ColorSchemeName>
>;
export type CoversAppearanceRead = Assert<
  Covers<ReturnType<typeof Appearance.getColorScheme>, ColorSchemeName>
>;
export type CoversAppearanceEvent = Assert<
  Covers<AppearanceChangeColorScheme, ColorSchemeName>
>;

/*******************************  Runtime plane  ******************************/

beforeEach(() => {
  mockSetColorScheme.mockClear();
});

test.each([
  ["light", "light"],
  ["dark", "dark"],
  ["unspecified", "unspecified"],
  [null, "unspecified"],
  [undefined, "unspecified"],
] satisfies [ColorSchemeName, string][])(
  "setAppearanceColorScheme(%p) reaches the native module as %p",
  (value, expected) => {
    setAppearanceColorScheme(value);

    expect(mockSetColorScheme).toHaveBeenCalledTimes(1);
    expect(mockSetColorScheme).toHaveBeenCalledWith(expected);
  },
);

test("prefers-color-scheme follows the scheme and releases on 'unspecified'", () => {
  registerCSS(`
.my-class { color: blue; }

@media (prefers-color-scheme: dark) {
  .my-class { color: red; }
}`);

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({ color: "#00f" });

  act(() => {
    colorScheme.set("dark");
  });
  expect(component.props.style).toStrictEqual({ color: "#f00" });

  act(() => {
    colorScheme.set("unspecified");
  });
  expect(component.props.style).toStrictEqual({ color: "#00f" });
});
