import { readAngle } from "react-native-css/utilities";

describe("readAngle", () => {
  test.each([
    [0, 0],
    ["90deg", "90deg"],
    ["-90DEG", "-90deg"],
    ["1rad", "1rad"],
    ["1turn", "360deg"],
    ["-0.5turn", "-180deg"],
    ["100grad", "90deg"],
    ["1e-1turn", "36deg"],
    [".5rad", ".5rad"],
  ])("%s reaches React Native as %s", (angle, expected) => {
    expect(readAngle(angle)).toBe(expected);
  });

  test.each([90, "90", "90px", "deg", "foo", null, undefined])(
    "%s is no angle",
    (argument) => {
      expect(readAngle(argument)).toBeUndefined();
    },
  );

  test("the reading is idempotent", () => {
    const once = readAngle("1turn");
    expect(readAngle(once)).toBe(once);
  });
});
