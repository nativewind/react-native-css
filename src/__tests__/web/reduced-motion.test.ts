import { reducedMotion } from "../../web/api";

test.each([
  [true, "reduce"],
  [false, "no-preference"],
] as const)(
  "reducedMotion reads %s from matchMedia as %s, and leaves it to the browser",
  (matches, preference) => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)" && matches,
      }),
    });

    try {
      expect(reducedMotion.get()).toBe(preference);
      reducedMotion.set(matches ? "no-preference" : "reduce");
      expect(reducedMotion.get()).toBe(preference);
    } finally {
      Reflect.deleteProperty(window, "matchMedia");
    }
  },
);

test("reducedMotion has no preference to read without matchMedia", () => {
  expect(reducedMotion.get()).toBeUndefined();
});
