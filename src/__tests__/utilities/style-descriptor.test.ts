import { isStyleFunction } from "react-native-css/utilities";

/**
 * A style function is a descriptor the runtime evaluates - `[{}, "var", …]`.
 * Its head is `Record<never, never>`: a plain object with no keys. Two other
 * shapes reach `typeof "object"` at index 0 without being one, and both occur
 * in a resolved value.
 */
describe("isStyleFunction", () => {
  test("a style function is one", () => {
    expect(isStyleFunction([{}, "var"])).toBe(true);
    expect(isStyleFunction([{}, "var", "font-sans", 1])).toBe(true);
  });

  test("a plain descriptor array is not", () => {
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
