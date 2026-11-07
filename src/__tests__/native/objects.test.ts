import {
  isPlainObject,
  valueAtPath,
  withDeepPaths,
  withoutKeys,
  withoutKeysAt,
} from "../../native/objects";

describe("withDeepPaths", () => {
  test("sets a nested value on copies of the objects on its path, leaving the source untouched", () => {
    const style = { color: "red" };
    const source = { style, testID: "image" };

    const result = withDeepPaths(source, [[["style", "tintColor"], "blue"]]);

    expect(result).toStrictEqual({
      style: { color: "red", tintColor: "blue" },
      testID: "image",
    });
    expect(result.style).not.toBe(style);
    expect(source).toStrictEqual({ style: { color: "red" }, testID: "image" });
  });

  test("creates the objects its path is missing", () => {
    expect(withDeepPaths({}, [[["outer", "inner"], 1]])).toStrictEqual({
      outer: { inner: 1 },
    });
  });

  test("keeps the symbol-keyed properties of the objects on its path", () => {
    const marker = Symbol("marker");
    const source = { [marker]: true, style: { [marker]: true, color: "red" } };

    expect(withDeepPaths(source, [[["style", "opacity"], 0.5]])).toStrictEqual({
      [marker]: true,
      style: { [marker]: true, color: "red", opacity: 0.5 },
    });
  });

  test("returns its source when no write has a path", () => {
    const source = { style: { color: "red" } };

    expect(withDeepPaths(source, [])).toBe(source);
    expect(withDeepPaths(source, [[[], "blue"]])).toBe(source);
  });

  test("writes in order, a later write replacing what an earlier one wrote at its path", () => {
    expect(
      withDeepPaths({}, [
        [["style", "color"], "red"],
        [["style", "opacity"], 0.5],
      ]),
    ).toStrictEqual({ style: { color: "red", opacity: 0.5 } });
    expect(
      withDeepPaths({}, [
        [["style", "color"], "red"],
        [["style"], { opacity: 0.5 }],
      ]),
    ).toStrictEqual({ style: { opacity: 0.5 } });
  });

  test("copies an object a write placed before a later write reaches into it", () => {
    const written = { opacity: 0.5 };

    const result = withDeepPaths({}, [
      [["style"], written],
      [["style", "color"], "red"],
    ]);

    expect(result).toStrictEqual({ style: { opacity: 0.5, color: "red" } });
    expect(written).toStrictEqual({ opacity: 0.5 });
  });

  test("gives the same result for the same input, however often it runs", () => {
    const source = { style: { color: "red" } };

    const first = withDeepPaths(source, [[["style", "opacity"], 0.5]]);
    const second = withDeepPaths(source, [[["style", "opacity"], 0.5]]);

    expect(first).toStrictEqual(second);
    expect(first).not.toBe(second);
    expect(source).toStrictEqual({ style: { color: "red" } });
  });
});

describe("isPlainObject", () => {
  test.each([
    ["an object literal", { color: "red" }, true],
    ["an object with no prototype", Object.create(null) as unknown, true],
    ["an array", [1], false],
    ["a function", () => ({}), false],
    ["a class instance", new Map(), false],
    ["null", null, false],
    ["a string", "red", false],
  ])("%s is plain: %s", (_, value, expected) => {
    expect(isPlainObject(value)).toBe(expected);
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

describe("valueAtPath", () => {
  test("reads the value at the end of its path, through objects and arrays", () => {
    const source = { style: { transform: [{ rotate: "45deg" }] } };

    expect(valueAtPath(source, ["style", "transform", "0", "rotate"])).toBe(
      "45deg",
    );
  });

  test("answers undefined for a key the path misses or a value it cannot read into", () => {
    expect(valueAtPath({ style: {} }, ["style", "color"])).toBeUndefined();
    expect(valueAtPath({ style: "red" }, ["style", "color"])).toBeUndefined();
    expect(valueAtPath(null, ["style"])).toBeUndefined();
  });

  test("returns its source for an empty path", () => {
    const source = { style: {} };

    expect(valueAtPath(source, [])).toBe(source);
  });
});

describe("withoutKeysAt", () => {
  test("drops the keys from a copy of the object at its path, leaving the source untouched", () => {
    const style = { color: "red", opacity: 1 };
    const source = { nested: { style }, testID: "view" };

    const result = withoutKeysAt(source, ["nested", "style"], ["color"]);

    expect(result).toStrictEqual({
      nested: { style: { opacity: 1 } },
      testID: "view",
    });
    expect(source).toStrictEqual({ nested: { style }, testID: "view" });
  });

  test("returns its source when its path meets no object or the object has none of the keys", () => {
    const source = { style: { opacity: 1 }, label: "x" };

    expect(withoutKeysAt(source, ["label", "style"], ["color"])).toBe(source);
    expect(withoutKeysAt(source, ["missing"], ["color"])).toBe(source);
    expect(withoutKeysAt(source, ["style"], ["color"])).toBe(source);
  });
});
