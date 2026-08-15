import { registerCSS } from "react-native-css/jest";

import {
  nonInheritedVariables,
  registeredInitialValues,
} from "../../native-internal/root";

// jest.resetModules() gives a fresh module registry against the same globalThis, which is
// exactly the dual package case: the exports map splits import and require onto different
// builds and Metro resolves that per requesting module, so two copies of
// native-internal/root evaluate in one bundle. StyleCollection is globalThis-pinned, so
// whichever copy wins does all the injecting and fills ITS registries

test("a second copy of the module shares the non-inheriting registry", async () => {
  // If this one were module-scoped, a rules.ts bound to the other copy would read an empty
  // Set and the filter would never fire — the ring leaks again, with nothing to indicate why
  const firstCopy = await import("../../native-internal/root");
  firstCopy.nonInheritedVariables.add("tw-ring-shadow");

  jest.resetModules();
  const secondCopy = await import("../../native-internal/root");

  // The module body really re-ran, so the assertion below is about two copies
  expect(secondCopy).not.toBe(firstCopy);

  expect(secondCopy.nonInheritedVariables).toBe(nonInheritedVariables);
  expect(secondCopy.nonInheritedVariables.has("tw-ring-shadow")).toBe(true);
});

test("a second copy of the module shares the registered initial values", async () => {
  const firstCopy = await import("../../native-internal/root");
  firstCopy.registeredInitialValues("tw-ring-offset-width").set([[0]]);

  jest.resetModules();
  const secondCopy = await import("../../native-internal/root");

  expect(secondCopy).not.toBe(firstCopy);

  expect(secondCopy.registeredInitialValues).toBe(registeredInitialValues);
  expect(secondCopy.registeredInitialValues("tw-ring-offset-width").get()).toBe(
    0,
  );
});

test("an @property initial value injected through one copy resolves in the other", async () => {
  // The registered initial value is not a fallback the resolver can do without. Tailwind
  // composes `--tw-ring-offset-width` into a length — `calc(2px + var(--tw-ring-offset-width))`
  // — ON THE ELEMENT THAT DECLARES THE RING, so a copy reading an empty registry does not
  // lose an inherited value it was never entitled to, it corrupts an arithmetic result the
  // declaring element computes for itself
  registerCSS(`
    @property --tw-ring-offset-width {
      syntax: "<length>";
      inherits: false;
      initial-value: 0px;
    }
    .ring { width: calc(2px + var(--tw-ring-offset-width)); }
    .offset { --tw-ring-offset-width: 4px; }
  `);

  expect(registeredInitialValues("tw-ring-offset-width").get()).toBe(0);

  jest.resetModules();
  const secondCopy = await import("../../native-internal/root");

  expect(secondCopy.registeredInitialValues("tw-ring-offset-width").get()).toBe(
    0,
  );
});
