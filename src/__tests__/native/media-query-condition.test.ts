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

test("prefers-color-scheme matches neither value when the scheme is unset", () => {
  colorScheme.set(null);
  expect(testMediaQuery(dark, get)).toBe(false);
  expect(testMediaQuery(light, get)).toBe(false);
});

test("prefers-color-scheme negates and combines like any other condition", () => {
  colorScheme.set("dark");
  expect(testMediaQuery([["!", prefersDark]], get)).toBe(false);
  expect(testMediaQuery([["!", prefersLight]], get)).toBe(true);
  expect(testMediaQuery([["&", [prefersDark, prefersLight]]], get)).toBe(false);
  expect(testMediaQuery([["|", [prefersDark, prefersLight]]], get)).toBe(true);
});
