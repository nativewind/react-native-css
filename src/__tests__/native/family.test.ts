import { generateHash } from "../../native/react/rules";
import { family, weakFamily } from "../../native/reactivity";

/**
 * `family` and `weakFamily` promise one factory call per key, and cached on the result being
 * truthy. A factory that legitimately returns `0`, `""` or `false` was therefore re-run on every
 * lookup, and its key never settled on a value.
 *
 * `hashKeyFamily` in `native/react/rules.ts` is such a factory: it hands out `hashKeyCount++`, so
 * the first weak key ever hashed is assigned `0` and is the one key that never caches. Its hash
 * changes between lookups, which splits every cache keyed on that hash.
 */

test("weakFamily calls its factory once per key when the result is falsy", () => {
  let calls = 0;
  const numbers = weakFamily<object, number>(() => calls++);
  const key = {};

  expect(numbers(key)).toBe(0);
  expect(numbers(key)).toBe(0);
  expect(calls).toBe(1);
});

test("family calls its factory once per key when the result is falsy", () => {
  let calls = 0;
  const numbers = family<string, number>(() => calls++);

  expect(numbers("key")).toBe(0);
  expect(numbers("key")).toBe(0);
  expect(calls).toBe(1);
});

test("a weak key hashes to the same value on every lookup", () => {
  // The key assigned `0` is the one the falsy-cache miss exposes, and it is whichever key this
  // module hashes FIRST. Asserting the value rather than only the agreement is what keeps that
  // true: a test added above this one that hashes would take the `0` and leave this passing
  // against a key that was never at risk.
  const key = {};

  expect(generateHash([key])).toBe("0");
  expect(generateHash([key])).toBe(generateHash([key]));
});

test("a bounded family never exceeds its cap", () => {
  // Unbounded is the pre-existing shape and it is reachable from the public API: `vars()` returns a
  // fresh object per call, so an inline `style={vars({...})}` hands the resolved-style cache a new
  // weak key — and therefore a new entry — on every render of a component that never unmounts.
  const bounded = family<string, { readonly key: string }>(
    (key) => ({ key }),
    4,
  );

  for (let index = 0; index < 40; index += 1) {
    bounded(`key-${String(index)}`);
  }

  expect(bounded.size()).toBe(4);
});

test("a bounded family evicts the least recently READ, not the oldest", () => {
  // Which entry goes matters more than that one goes. The workload that fills this cache is a
  // churn of single-use keys arriving beside a small set that is read every render — so evicting by
  // insertion order would discard exactly the entries worth keeping and leave the garbage.
  const built: string[] = [];
  const bounded = family<string, { readonly key: string }>((key) => {
    built.push(key);
    return { key };
  }, 3);

  bounded("keep");
  bounded("evict-me");
  bounded("also-keep");
  bounded("keep"); // a read, which must renew it
  bounded("also-keep");
  bounded("fresh"); // pushes past the cap

  // Re-reading tells us which survived: a survivor is served from the map, an evicted key is built
  // a second time. That is a stronger check than a membership helper — it proves the entry is gone
  // rather than merely unreported.
  bounded("keep");
  bounded("also-keep");
  bounded("fresh");
  bounded("evict-me");

  expect(bounded.size()).toBe(3);
  expect(built).toStrictEqual([
    "keep",
    "evict-me",
    "also-keep",
    "fresh",
    "evict-me",
  ]);
});

test("an unbounded family is unchanged", () => {
  // Every other `family` in the library is keyed by something the stylesheet bounds — a class name,
  // a variable name — so a cap there would be a cost with nothing to buy. Omitting it must keep the
  // exact prior behaviour rather than applying a default.
  const unbounded = family<string, { readonly key: string }>((key) => ({
    key,
  }));

  for (let index = 0; index < 40; index += 1) {
    unbounded(`key-${String(index)}`);
  }

  expect(unbounded.size()).toBe(40);
});

test("deleteIf removes a key only while it still maps to that value", () => {
  // A cached value that releases itself knows the key it was created under, and that key may since
  // have been remapped — by eviction and a rebuild, or by a consumer that superseded its own entry.
  // Deleting by key alone then destroys whatever took the key, which is live and someone else's.
  const built: string[] = [];
  const cache = family<string, { readonly built: number }>((key) => {
    built.push(key);
    return { built: built.length };
  });

  const original = cache("shared");
  cache.delete("shared");
  const replacement = cache("shared");

  expect(replacement).not.toBe(original);

  // The original releasing itself must not touch the replacement.
  expect(cache.deleteIf("shared", original)).toBe(false);
  expect(cache.size()).toBe(1);
  expect(cache("shared")).toBe(replacement);

  // The holder of the current value can still release it.
  expect(cache.deleteIf("shared", replacement)).toBe(true);
  expect(cache.size()).toBe(0);
});
