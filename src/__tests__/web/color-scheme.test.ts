/**
 * @jest-environment jsdom
 */
import { Appearance } from "react-native";

import { colorScheme } from "../../web/api";

const root = () => document.documentElement;

afterEach(() => {
  colorScheme.set(null);
  root().removeAttribute("class");
  root().removeAttribute("style");
});

test("react-native-web's Appearance has no setter to forward to", () => {
  const { Appearance: WebAppearance } =
    jest.requireActual<Record<"Appearance", object>>("react-native-web");

  expect(WebAppearance).not.toHaveProperty("setColorScheme");
});

test.each(["dark", "light"] as const)(
  "set(%s) marks the root with the scheme and its color-scheme",
  (scheme) => {
    colorScheme.set(scheme);

    expect([...root().classList]).toStrictEqual([scheme]);
    expect(root().style.getPropertyValue("color-scheme")).toBe(scheme);
    expect(colorScheme.get()).toBe(scheme);
  },
);

test("a scheme replaces the one set before it", () => {
  colorScheme.set("dark");
  colorScheme.set("light");

  expect([...root().classList]).toStrictEqual(["light"]);
  expect(root().style.getPropertyValue("color-scheme")).toBe("light");
});

test.each([null, undefined, "unspecified"] as const)(
  "set(%p) returns the root to the system scheme",
  (value) => {
    colorScheme.set("dark");
    colorScheme.set(value);

    expect([...root().classList]).toStrictEqual([]);
    expect(root().style.getPropertyValue("color-scheme")).toBe("");
    expect(colorScheme.get()).toBe(Appearance.getColorScheme() ?? "light");
  },
);

test("get() reads a scheme the app put on the root itself", () => {
  root().classList.add("dark");

  expect(colorScheme.get()).toBe("dark");
});

test("the root keeps its other classes and inline styles", () => {
  root().classList.add("app");
  root().style.setProperty("font-size", "16px");

  colorScheme.set("dark");
  colorScheme.set(null);

  expect([...root().classList]).toStrictEqual(["app"]);
  expect(root().style.getPropertyValue("font-size")).toBe("16px");
});
