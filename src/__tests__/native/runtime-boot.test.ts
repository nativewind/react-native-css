/**
 * The compiler runs at build time — inside Metro, inside a bundler plugin,
 * inside this suite. The native runtime is a different plane, and evaluating
 * it is not free: `native/reactivity` subscribes to `Dimensions` and to
 * `Appearance` at module scope, so merely importing it installs two listeners
 * on the host.
 *
 * The compiler-plane suite pins the source shape that keeps the two apart — no
 * module reference out of `src/compiler/` survives emit into the runtime
 * planes. This is the same invariant observed from the other side, at runtime
 * and through the whole transitive graph: load the compiler and count what it
 * attached to React Native. A path that reaches the runtime through a third
 * directory is invisible to a scan of `src/compiler/` and is caught here.
 */

import type * as ReactNative from "react-native";

interface RuntimeListeners {
  dimensions: number;
  appearance: number;
}

/**
 * `react-native` is a CommonJS module, so a dynamic import of it hands back an
 * interop namespace whose `default` is the module object. Reading the named
 * exports off the namespace directly yields `undefined` under this transform,
 * which is why the fallback exists rather than a straight destructure.
 */
async function importReactNative(): Promise<typeof ReactNative> {
  const imported = await import("react-native");
  const interop = imported as unknown as { default?: typeof ReactNative };

  return interop.default ?? imported;
}

/**
 * Runs `load` against a fresh module registry and reports the module-scope
 * listeners it left behind.
 *
 * The spies have to sit on the `react-native` copy the reset registry hands
 * out, which is a different object from the one an ordinary top-level import
 * of this file would hold.
 */
async function listenersRegisteredBy(
  load: () => Promise<unknown>,
): Promise<RuntimeListeners> {
  jest.resetModules();

  const { Appearance, Dimensions } = await importReactNative();

  const dimensions = jest.spyOn(Dimensions, "addEventListener");
  const appearance = jest.spyOn(Appearance, "addChangeListener");

  try {
    await load();

    return {
      dimensions: dimensions.mock.calls.length,
      appearance: appearance.mock.calls.length,
    };
  } finally {
    dimensions.mockRestore();
    appearance.mockRestore();
  }
}

test("evaluating the native runtime registers its host listeners", async () => {
  // The premise everything below rests on, and the vacuity guard on it: if the
  // runtime stopped subscribing at module scope, every "registers nothing"
  // assertion would hold for a reason that has nothing to do with isolation.
  await expect(
    listenersRegisteredBy(() => import("../../native/reactivity")),
  ).resolves.toStrictEqual({ dimensions: 1, appearance: 1 });
});

test("the compiler's type module registers none", async () => {
  // `compiler.types` declares nothing but types. A value import of the runtime
  // in it is not elided — the module reference survives emit and evaluates the
  // runtime for a symbol that is only ever used as a type.
  await expect(
    listenersRegisteredBy(() => import("../../compiler/compiler.types")),
  ).resolves.toStrictEqual({ dimensions: 0, appearance: 0 });
});

test("importing the compiler entry registers none", async () => {
  // The invariant a consumer actually feels: `react-native-css/compiler` is a
  // build-time entry point, and pulling it into a bundle must not drag the
  // native runtime along behind it.
  await expect(
    listenersRegisteredBy(() => import("react-native-css/compiler")),
  ).resolves.toStrictEqual({ dimensions: 0, appearance: 0 });
});
