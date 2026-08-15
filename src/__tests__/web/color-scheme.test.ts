import { Appearance } from "react-native";

import { colorScheme } from "../../web/api";

// The web plane imports `Appearance` from "react-native", and the bundler
// substitutes react-native-web. TypeScript resolves react-native's `.d.ts`
// either way, so it sees a full `Appearance` and the substitution is invisible
// to `yarn typecheck` — only running the web module against react-native-web
// can observe what the web plane actually gets. Babel hoists this above the
// imports above.
jest.mock("react-native", () =>
  jest.requireActual<Record<string, unknown>>("react-native-web"),
);

test("react-native-web's Appearance exposes no setColorScheme", () => {
  // The upstream constraint the web plane is written against. If
  // react-native-web grows a setter, this fails and `colorScheme.set` can
  // forward to it.
  expect(typeof Appearance.getColorScheme).toBe("function");
  expect(typeof Appearance.addChangeListener).toBe("function");
  expect(Appearance).not.toHaveProperty("setColorScheme");
});

test("colorScheme.get reads the browser preference", () => {
  expect(colorScheme.get()).toBe(Appearance.getColorScheme());
});

test("colorScheme.set reports that the web plane cannot override the scheme", () => {
  // Not a TypeError from calling through to a member that does not exist, and
  // not a silent no-op either.
  expect(() => {
    colorScheme.set("dark");
  }).toThrow(/not supported on web.*browser owns the color scheme/i);
});
