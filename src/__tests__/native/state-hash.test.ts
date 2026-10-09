import { generateHash } from "../../native/react/rules";

const keysOf = (count: number): WeakKey[] =>
  Array.from({ length: count }, () => ({}));

test("distinct key sets never share a hash", () => {
  const keys = keysOf(60);
  const owner = new Map<string, string>();

  for (const [leftIndex, left] of keys.entries()) {
    for (const [offset, right] of keys.slice(leftIndex + 1).entries()) {
      const signature = `${String(leftIndex)}+${String(leftIndex + 1 + offset)}`;
      const hash = generateHash([left, right]);
      const prior = owner.get(hash);

      expect(prior ?? signature).toBe(signature);
      owner.set(hash, signature);
    }
  }

  expect(owner.size).toBe((keys.length * (keys.length - 1)) / 2);
});

test("a key set hashes the same however it is ordered", () => {
  const first: WeakKey = {};
  const second: WeakKey = {};
  const third: WeakKey = {};

  expect(generateHash([first, second, third])).toBe(
    generateHash([third, first, second]),
  );
});

test("a key outside WeakKey is refused rather than erased", () => {
  const key: WeakKey = {};

  expect(() => generateHash([key, undefined as unknown as WeakKey])).toThrow();
});

test("hashing the same key twice answers the same value", () => {
  const only: WeakKey = {};

  expect(generateHash([only])).toBe(generateHash([only]));
});

test("the encoding is integers, not floats or exponents", () => {
  const keys: WeakKey[] = [{}, {}, {}];

  expect(generateHash(keys)).toMatch(/^\d+(?:,\d+)*$/u);
});
