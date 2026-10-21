import { Appearance } from "react-native";

import { colorScheme } from "../../web/api";

test("with no document, as while a route prerenders, set() is a no-op and get() reads the system scheme", () => {
  expect(typeof document).toBe("undefined");

  expect(() => {
    colorScheme.set("dark");
  }).not.toThrow();
  expect(colorScheme.get()).toBe(Appearance.getColorScheme() ?? "light");
});
