import {
  isStyleDescriptorArray,
  isStyleFunction,
} from "react-native-css/utilities";

describe("isStyleFunction", () => {
  test("a style function is one", () => {
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
    expect(isStyleFunction([[], "Arial"])).toBe(false);
    expect(isStyleFunction([["Inter"], "Arial"])).toBe(false);
  });

  test("an array headed by null is not, and does not throw", () => {
    // `typeof null` is `"object"`, and `Object.keys(null)` throws.
    expect(isStyleFunction([null, "Arial"])).toBe(false);
  });
});

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
    expect(isStyleDescriptorArray([null, "Arial"])).toBe(true);
  });
});
