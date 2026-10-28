import {
  readNonNegativeAmount,
  readNonNegativeLength,
} from "react-native-css/utilities";

describe("readNonNegativeLength", () => {
  test.each([0, 2, 0.5])("%s is a length blur takes", (length) => {
    expect(readNonNegativeLength(length)).toBe(length);
  });

  test.each([-1, "2px", "50%", "foo", null, undefined])(
    "%s is no length blur takes",
    (argument) => {
      expect(readNonNegativeLength(argument)).toBeUndefined();
    },
  );
});

describe("readNonNegativeAmount", () => {
  test.each([0, 1.5, "0%", "150%", ".5%", "+50%", "1e2%"])(
    "%s is an amount a filter takes",
    (amount) => {
      expect(readNonNegativeAmount(amount)).toBe(amount);
    },
  );

  test.each([-0.5, "-10%", "-1e2%", "2px", "foo", "%", "5.%", null, undefined])(
    "%s is no amount a filter takes",
    (argument) => {
      expect(readNonNegativeAmount(argument)).toBeUndefined();
    },
  );
});
