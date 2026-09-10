import assert from "node:assert/strict";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const helper = require.resolve("../../dist/commonjs/metro/cache-version.js");

/** @param {import("node:test").TestContext} t */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "css-cache-version-"));
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
  });
  mkdirSync(join(root, "metro"));
  mkdirSync(join(root, "compiler"));
  copyFileSync(helper, join(root, "metro/cache-version.cjs"));
  writeFileSync(join(root, "compiler/value.js"), "exports.value = 14;");
  return {
    root,
    key: /** @type {{getCacheVersion: (version?: string, options?: object) => string}} */ (
      require(join(root, "metro/cache-version.cjs"))
    ).getCacheVersion,
  };
}

await test("unchanged input and relocated packages have the same fingerprint", (t) => {
  const a = fixture(t),
    b = fixture(t);
  assert.equal(a.key("user", {}), a.key("user", {}));
  assert.equal(a.key("user", {}), b.key("user", {}));
});

await test("compiler code changes invalidate and restoration recovers the key", (t) => {
  const { root, key } = fixture(t);
  const before = key("user", {});
  writeFileSync(join(root, "compiler/value.js"), "exports.value = 18;");
  assert.notEqual(key("user", {}), before);
  writeFileSync(join(root, "compiler/value.js"), "exports.value = 14;");
  assert.equal(key("user", {}), before);
});

await test("new source modules invalidate and removal recovers the key", (t) => {
  const { root, key } = fixture(t);
  const before = key("user", {});
  writeFileSync(join(root, "compiler/new.js"), "exports.value = 18;");
  assert.notEqual(key("user", {}), before);
  rmSync(join(root, "compiler/new.js"));
  assert.equal(key("user", {}), before);
});

await test("compiler options invalidate the cache", (t) => {
  const { key } = fixture(t);
  assert.notEqual(
    key("user", { inlineRem: 14 }),
    key("user", { inlineRem: 18 }),
  );
  assert.notEqual(key("user", { inlineVariables: false }), key("user", {}));
  assert.notEqual(key("user", { features: { test: true } }), key("user", {}));
});

await test("user cacheVersion is preserved and remains an invalidation input", (t) => {
  const { key } = fixture(t);
  assert.match(key("user", {}), /^user:react-native-css:[0-9a-f]{64}$/);
  assert.notEqual(key("user", {}), key("other", {}));
  assert.equal(key(undefined, undefined), key("", {}));
});

await test("maps, declarations, tests, and unrelated files do not invalidate", (t) => {
  const { root, key } = fixture(t);
  const before = key("user", {});
  mkdirSync(join(root, "compiler/__tests__"));
  for (const name of [
    "compiler/value.js.map",
    "compiler/value.d.ts",
    "compiler/__tests__/value.js",
    "README.md",
  ]) {
    writeFileSync(join(root, name), "ignored");
  }
  assert.equal(key("user", {}), before);
});

await test("source condition TypeScript modules invalidate", (t) => {
  const { root, key } = fixture(t);
  const before = key("user", {});
  writeFileSync(join(root, "compiler/source.ts"), "export const value = 18;");
  assert.notEqual(key("user", {}), before);
});
