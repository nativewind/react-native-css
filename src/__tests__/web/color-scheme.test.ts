import { Appearance } from "react-native";

import { colorScheme } from "../../web/api";

afterEach(() => {
  jest.restoreAllMocks();
});

test.each([
  ["dark", "dark"],
  ["light", "light"],
  ["unspecified", "light"],
  [null, "light"],
] as const)(
  "web colorScheme.get() answers %p from Appearance as %p",
  (reported, expected) => {
    jest.spyOn(Appearance, "getColorScheme").mockReturnValue(reported);

    expect(colorScheme.get()).toBe(expected);
  },
);
