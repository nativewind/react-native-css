import {
  resolveRootVariableRegistries,
  rootVariables,
  universalVariables,
} from "../../native-internal/root";

/**
 * The `:root` registries are global, and created + seeded exactly once.
 *
 * The package's `exports` map splits `import` and `require` onto different
 * builds, and Metro resolves that condition per requesting module — so a
 * compiled-CommonJS dependency and first-party source bind different copies of
 * `native-internal/root`. Module-scope registries made that two independent
 * stores: a `:root` variable injected into one copy was invisible to the
 * other, and the value silently fell back to its seed.
 *
 * `resolveRootVariableRegistries` is what a second copy of the module runs, so
 * calling it directly reproduces the second copy without needing the module
 * itself to be re-evaluated.
 */
test("the module's exports are the registries published on globalThis", () => {
  const registries = globalThis.__react_native_css_root_variable_registries;

  expect(registries).toBeDefined();
  expect(rootVariables).toBe(registries?.root);
  expect(universalVariables).toBe(registries?.universal);
});

test("a second copy resolves the same registries", () => {
  // Captured BEFORE the call: comparing against the global afterwards passes
  // even when the resolver replaces it, which is no assertion at all.
  const before = globalThis.__react_native_css_root_variable_registries;

  expect(resolveRootVariableRegistries()).toBe(before);
});

test("a second copy does not re-seed over an injected value", () => {
  // The regression a `??=` on the registries ALONE would ship: the seeds run
  // unconditionally, so a copy initialising AFTER the stylesheet inject
  // clobbers a project's `:root { font-size: 16px }` back to 14 and rescales
  // every rem-derived value to 87.5%.
  expect(rootVariables("__rn-css-rem").get()).toBe(14);

  rootVariables("__rn-css-rem").set([[16]]);

  expect(resolveRootVariableRegistries().root("__rn-css-rem").get()).toBe(16);
});
