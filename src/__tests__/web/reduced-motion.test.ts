import { reducedMotion } from "../../web/api";

function withMatchMedia(value: unknown, run: () => void) {
  Object.defineProperty(window, "matchMedia", { configurable: true, value });
  try {
    run();
  } finally {
    Reflect.deleteProperty(window, "matchMedia");
    reducedMotion.set(null);
  }
}

test.each([
  [true, "reduce"],
  [false, "no-preference"],
] as const)(
  "reducedMotion reads %s from matchMedia as %s",
  (matches, preference) => {
    withMatchMedia(
      (query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)" && matches,
      }),
      () => {
        expect(reducedMotion.get()).toBe(preference);
      },
    );
  },
);

test("an override changes what scripts read until set(null) reads matchMedia again", () => {
  withMatchMedia(
    () => ({ matches: true }),
    () => {
      reducedMotion.set("no-preference");
      expect(reducedMotion.get()).toBe("no-preference");

      reducedMotion.set(null);
      expect(reducedMotion.get()).toBe("reduce");
    },
  );
});

test.each([
  ["no matchMedia", undefined],
  ["a matchMedia that is no function", {}],
])("reducedMotion has no preference to read with %s", (_, value) => {
  withMatchMedia(value, () => {
    expect(reducedMotion.get()).toBeUndefined();
  });
});
