import { withDeepPath, withoutKeys } from "../../native/objects";

describe("withDeepPath", () => {
  test("sets a nested value on copies of the objects on its path, leaving the source untouched", () => {
    const style = { color: "red" };
    const source = { style, testID: "image" };

    const result = withDeepPath(source, ["style", "tintColor"], "blue");

    expect(result).toStrictEqual({
      style: { color: "red", tintColor: "blue" },
      testID: "image",
    });
    expect(result.style).not.toBe(style);
    expect(source).toStrictEqual({ style: { color: "red" }, testID: "image" });
  });

  test("creates the objects its path is missing", () => {
    expect(withDeepPath({}, ["outer", "inner"], 1)).toStrictEqual({
      outer: { inner: 1 },
    });
  });

  test("returns its source for an empty path", () => {
    const source = { style: { color: "red" } };

    expect(withDeepPath(source, [], "blue")).toBe(source);
  });

  test("gives the same result for the same input, however often it runs", () => {
    const source = { style: { color: "red" } };

    const first = withDeepPath(source, ["style", "opacity"], 0.5);
    const second = withDeepPath(source, ["style", "opacity"], 0.5);

    expect(first).toStrictEqual(second);
    expect(first).not.toBe(second);
    expect(source).toStrictEqual({ style: { color: "red" } });
  });
});

describe("withoutKeys", () => {
  test("returns the source itself when it has none of the keys", () => {
    const source = { color: "red" };

    expect(withoutKeys(source, ["tintColor"])).toBe(source);
  });

  test("keeps a symbol-keyed property", () => {
    const marker = Symbol("marker");
    const source = { [marker]: true, color: "red", opacity: 1 };

    expect(withoutKeys(source, ["color"])).toStrictEqual({
      [marker]: true,
      opacity: 1,
    });
  });

  test("drops the keys from a copy, leaving the source untouched", () => {
    const source = { color: "red", opacity: 1 };

    expect(withoutKeys(source, ["color"])).toStrictEqual({ opacity: 1 });
    expect(source).toStrictEqual({ color: "red", opacity: 1 });
  });
});
