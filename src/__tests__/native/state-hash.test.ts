import { generateHash, generateStateHash } from "../../native/react/rules";
import type { ComponentState } from "../../native/react/useNativeCss";

/**
 * `generateHash` keys the resolved-style cache. Two different sets of rules landing on one key does
 * not cost a cache miss — `family` returns the entry it already holds and ignores the rules the
 * second caller brought, so that element renders the first element's styles.
 *
 * Measured with the previous, weak hash: a `vertical-align: top` element rendered
 * `object-fit: contain` because both rule sets hashed to `18h`.
 */

const keysOf = (count: number): WeakKey[] =>
  Array.from({ length: count }, () => ({}));

test("distinct key sets never share a hash", () => {
  const keys = keysOf(60);
  const owner = new Map<number, string>();

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

test("the hash is a safe integer", () => {
  // Built from 32 + 21 bits, so it must stay exactly representable as a number. A float or a value
  // past 2^53 would round, and rounding merges distinct hashes.
  const keys: WeakKey[] = [{}, {}, {}];

  expect(Number.isSafeInteger(generateHash(keys))).toBe(true);
  expect(Number.isSafeInteger(generateHash(keysOf(200)))).toBe(true);
});

test("many distinct key sets of realistic shapes never share a hash", () => {
  // A config plus every pair from 600 keys (the shape the previous hash collided on most), plus
  // large sets the size of a heavily styled element.
  const config: WeakKey = {};
  const keys = keysOf(600);
  const seen = new Set<number>();
  let sets = 0;

  for (const [index, left] of keys.entries()) {
    for (const right of keys.slice(index + 1)) {
      seen.add(generateHash([config, left, right]));
      sets++;
    }
  }
  for (let start = 0; start + 46 <= keys.length; start++) {
    seen.add(generateHash([config, ...keys.slice(start, start + 46)]));
    sets++;
  }

  expect(seen.size).toBe(sets);
});

test("a state hash always carries the config", () => {
  // The config is an unconditional member of the key set, so a state with no rules still differs
  // from the empty set, and two configs with the same rules differ from each other.
  const configs = { configs: [] } as unknown as ComponentState;
  const other = { configs: [] } as unknown as ComponentState;
  const rule: WeakKey = {};

  expect(generateStateHash(configs, [])).not.toBe(generateHash([]));
  expect(generateStateHash(configs, [rule])).not.toBe(
    generateStateHash(other, [rule]),
  );
});
