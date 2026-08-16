import {
  isStyleDescriptorArray,
  isStyleFunction,
} from "react-native-css/utilities";

/**
 * A style function is a descriptor the runtime evaluates - `[{}, "var", …]`.
 * Its head is `Record<never, never>`: a plain object with no keys. Two other
 * shapes reach `typeof "object"` at index 0 without being one, and both occur
 * in a resolved value.
 */
describe("isStyleFunction", () => {
  test("a style function is one", () => {
    // CONTROL — passes on `main`. Widening the guard is the easy way to fix the
    // two cases below, and this is what says the answer did not move.
    expect(isStyleFunction([{}, "var"])).toBe(true);
    expect(isStyleFunction([{}, "var", "font-sans", 1])).toBe(true);
  });

  test("a plain descriptor array is not", () => {
    // CONTROL — passes on `main`, for the same reason.
    expect(isStyleFunction(["Inter", "Helvetica"])).toBe(false);
    expect(isStyleFunction([])).toBe(false);
    expect(isStyleFunction("Inter")).toBe(false);
    expect(isStyleFunction(undefined)).toBe(false);
  });

  test("an array headed by an empty array is not", () => {
    // `Object.keys([])` is also empty, so an empty first GROUP reads as a
    // function head unless the array case is excluded first.
    expect(isStyleFunction([[], "Arial"])).toBe(false);
    expect(isStyleFunction([["Inter"], "Arial"])).toBe(false);
  });

  test("an array headed by null is not, and does not throw", () => {
    // `typeof null` is `"object"`, and `Object.keys(null)` throws.
    expect(isStyleFunction([null, "Arial"])).toBe(false);
  });
});

/**
 * The sibling predicate, six lines above `isStyleFunction` in the same file and
 * asking the same question from the other side: is this a list of VALUES rather
 * than a function to evaluate? It carries the identical `typeof value[0] ===
 * "object"` trap, so the null case lands on it too.
 */
describe("isStyleDescriptorArray", () => {
  test("a plain descriptor array is one", () => {
    // CONTROL — passes on `main`. Says the answer did not move.
    expect(isStyleDescriptorArray(["Inter", "Helvetica"])).toBe(true);
    expect(isStyleDescriptorArray([1, 2])).toBe(true);
  });

  test("a style function is not one", () => {
    // CONTROL — the discrimination this predicate exists to make.
    expect(isStyleDescriptorArray([{}, "var", "font-sans"])).toBe(false);
  });

  test("an array headed by an array is one", () => {
    // A nested group is a descriptor, not a function head.
    expect(isStyleDescriptorArray([["Inter"], "Arial"])).toBe(true);
  });

  test("an array headed by null is one", () => {
    // `typeof null` is `"object"`, so the raw check falls into the branch that
    // demands an array and answers `false`. But `null` is a VALUE — a hole the
    // compiler left, which reaches a native runtime as `null` after
    // `JSON.stringify` — so this is a descriptor array like any other.
    expect(isStyleDescriptorArray([null, "Arial"])).toBe(true);
  });
});
