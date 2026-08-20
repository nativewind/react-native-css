import { generateHash } from "../../native/react/rules";

/**
 * `generateHash` keys the resolved-style cache. Two different sets of rules landing on one key does
 * not cost a cache miss — `family` returns the entry it already holds and ignores the rules the
 * second caller brought, so that element renders the first element's styles.
 *
 * Measured before this was injective: a `vertical-align: top` element rendered `object-fit: contain`
 * because both rule sets hashed to `18h`.
 */

/** Distinct weak keys. Any object is a valid one. */
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

  // Vacuity guard: the loop above must actually have hashed every pair.
  expect(owner.size).toBe((keys.length * (keys.length - 1)) / 2);
});

test("a key set hashes the same however it is ordered", () => {
  // The rule set reaching `generateStateHash` is a Set built in render order, so order-independence
  // is what lets two elements with the same rules share one entry at all.
  const first: WeakKey = {};
  const second: WeakKey = {};
  const third: WeakKey = {};

  expect(generateHash([first, second, third])).toBe(
    generateHash([third, first, second]),
  );
});

test("a key outside WeakKey is refused rather than erased", () => {
  // The encoding is exact only if it encodes every member. Skipping one — which the inherited
  // `if (!key) continue` did — makes `[a, b]` and `[a, falsy, b]` the same string, and a cache
  // key collision hands the second caller the first caller's styles. Unreachable from typed code,
  // so this pins the contract rather than a bug: out of domain fails, it does not vanish.
  const key: WeakKey = {};

  expect(() => generateHash([key, undefined as unknown as WeakKey])).toThrow();
});

test("hashing the same key twice answers the same value", () => {
  // `hashKeyFamily` assigns each key a number once. A key whose number is not retained hashes
  // differently on its second lookup, which splits its cache entry.
  const only: WeakKey = {};

  expect(generateHash([only])).toBe(generateHash([only]));
});

test("the encoding is integers, not floats or exponents", () => {
  // The ordering runs through a `Float64Array`, so every member is a double by the time it is
  // joined. `Number.prototype.toString` renders an integral double without a fraction, and only
  // switches to exponential notation past 1e21 — far beyond a key counter. Pinning it here means a
  // future change to the array type has to face the question rather than silently reshape the key.
  const keys: WeakKey[] = [{}, {}, {}];

  expect(generateHash(keys)).toMatch(/^\d+(?:,\d+)*$/u);
});
