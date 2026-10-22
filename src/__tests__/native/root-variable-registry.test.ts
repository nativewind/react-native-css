import { rootVariables, universalVariables } from "../../native-internal/root";

test("the module's exports are the registries published on globalThis", () => {
  const registries = globalThis.__react_native_css_root_variable_registries;

  expect(registries).toBeDefined();
  expect(rootVariables).toBe(registries?.root);
  expect(universalVariables).toBe(registries?.universal);
});

test("a second copy of the module shares the registries and does not re-seed", () => {
  // resetModules evaluates the module again against the same globalThis, as a second build in one bundle does
  const firstCopy = jest.requireActual<
    typeof import("../../native-internal/root")
  >("../../native-internal/root");

  expect(firstCopy.rootVariables("__rn-css-rem").get()).toBe(14);
  firstCopy.rootVariables("__rn-css-rem").set([[16]]);

  jest.resetModules();
  const secondCopy = jest.requireActual<
    typeof import("../../native-internal/root")
  >("../../native-internal/root");

  // The module body really re-ran, so the assertions below are about two copies
  expect(secondCopy).not.toBe(firstCopy);

  expect(secondCopy.rootVariables).toBe(firstCopy.rootVariables);
  expect(secondCopy.rootVariables("__rn-css-rem").get()).toBe(16);
});
