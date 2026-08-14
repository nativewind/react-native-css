import { nonInheritedVariables } from "../../native-internal/root";

test("a second copy of the module shares the non-inheriting registry", async () => {
  // The exports map splits import and require onto different builds and Metro resolves
  // that per requesting module, so two copies of native-internal/root can load in one
  // bundle. StyleCollection is globalThis-pinned, so whichever copy wins it does all the
  // injecting and fills ITS registry. If this one were module-scoped, a rules.ts bound to
  // the other copy would read an empty Set and the filter would never fire — the ring
  // leaks again, with nothing to indicate why.
  const firstCopy = await import("../../native-internal/root");
  firstCopy.nonInheritedVariables.add("tw-ring-shadow");

  jest.resetModules();
  const secondCopy = await import("../../native-internal/root");

  // The module body really re-ran, so the assertion below is about two copies
  expect(secondCopy).not.toBe(firstCopy);

  expect(secondCopy.nonInheritedVariables).toBe(nonInheritedVariables);
  expect(secondCopy.nonInheritedVariables.has("tw-ring-shadow")).toBe(true);
});
