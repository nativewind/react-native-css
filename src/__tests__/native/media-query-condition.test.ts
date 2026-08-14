import type { MediaCondition } from "react-native-css/compiler";

import { testMediaQuery } from "../../native/conditions/media-query";
import { colorScheme, type Getter } from "../../native/reactivity";

// `testMediaQuery` is the runtime half of a `@media` rule: the compiler emits
// the condition array, this evaluates it. Reaching it through a rendered
// component also exercises the collection and the style resolver, so a
// condition that is evaluated wrongly can still produce the right style. These
// feed the condition in directly.
const get: Getter = (observable) => observable.get();

const prefersDark: MediaCondition = ["=", "prefers-color-scheme", "dark"];
const prefersLight: MediaCondition = ["=", "prefers-color-scheme", "light"];

const dark: MediaCondition[] = [prefersDark];
const light: MediaCondition[] = [prefersLight];

test("prefers-color-scheme matches the current colorScheme", () => {
  colorScheme.set("dark");
  expect(testMediaQuery(dark, get)).toBe(true);
  expect(testMediaQuery(light, get)).toBe(false);

  colorScheme.set("light");
  expect(testMediaQuery(dark, get)).toBe(false);
  expect(testMediaQuery(light, get)).toBe(true);
});

// `Appearance.getColorScheme()` returns null whenever the OS reports
// `unspecified` or the native module is absent, so this is a reachable
// production state and not a test-harness artifact. MQ5 resolves it to `light`:
// "light indicates that the user has expressed the preference for a light
// theme, or has not expressed an active preference". The rest of the library
// already assumes that — `light-dark()` compiles to a light base rule with the
// dark value behind `prefers-color-scheme: dark`, `colorScheme.get()` on native
// ends in `?? "light"`, and react-native-web's `getColorScheme()` reads the
// dark media query and answers "light" when it does not match.
test("prefers-color-scheme is light when no preference is set", () => {
  colorScheme.set(null);
  expect(testMediaQuery(dark, get)).toBe(false);
  expect(testMediaQuery(light, get)).toBe(true);
});

// The fallback picks a value for the comparison; it does not turn the condition
// into a two-way branch. MQ5 requires an unrecognised value to be false rather
// than aliasing to the other one.
test("prefers-color-scheme does not match a value outside the two it defines", () => {
  const nonsense: MediaCondition[] = [
    ["=", "prefers-color-scheme", "no-preference"],
  ];

  colorScheme.set(null);
  expect(testMediaQuery(nonsense, get)).toBe(false);

  colorScheme.set("dark");
  expect(testMediaQuery(nonsense, get)).toBe(false);
});

test("prefers-color-scheme negates and combines like any other condition", () => {
  colorScheme.set("dark");
  expect(testMediaQuery([["!", prefersDark]], get)).toBe(false);
  expect(testMediaQuery([["!", prefersLight]], get)).toBe(true);
  expect(testMediaQuery([["&", [prefersDark, prefersLight]]], get)).toBe(false);
  expect(testMediaQuery([["|", [prefersDark, prefersLight]]], get)).toBe(true);
});
