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
  ["a matchMedia stub that returns nothing", () => undefined],
])("reducedMotion has no preference to read with %s", (_, value) => {
  withMatchMedia(value, () => {
    expect(reducedMotion.get()).toBeUndefined();
  });
});

test("a server keeps no override, since it renders every visitor's page in one process", () => {
  const browserWindow: unknown = globalThis.window;
  Reflect.deleteProperty(globalThis, "window");

  try {
    reducedMotion.set("reduce");
    expect(reducedMotion.get()).toBeUndefined();
  } finally {
    Reflect.set(globalThis, "window", browserWindow);
  }

  expect(reducedMotion.get()).toBeUndefined();
});

test("reducedMotion reads a matchMedia double's new answer", () => {
  const matchMedia = jest.fn(() => ({ matches: false }));

  withMatchMedia(matchMedia, () => {
    expect(reducedMotion.get()).toBe("no-preference");

    matchMedia.mockImplementation(() => ({ matches: true }));

    expect(reducedMotion.get()).toBe("reduce");
  });
});
