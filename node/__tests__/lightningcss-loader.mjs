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
import { dirname, join } from "node:path";
import { env } from "node:process";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const override = env.CSS_LOADER_UNDER_TEST;
const helper =
  typeof override === "string"
    ? override
    : require.resolve("../../dist/commonjs/compiler/lightningcss-loader.js");

/** @param {import("node:test").TestContext} t */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "css-lightning-loader-"));
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
  });
  /** @param {string} file @param {string} content */
  const put = (file, content) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  copyFileSync(helper, join(root, "loader.cjs"));
  return {
    put,
    expo() {
      put(
        "node_modules/@expo/metro-config/package.json",
        JSON.stringify({ name: "@expo/metro-config", version: "57.0.12" }),
      );
    },
    /** @param {string} version */
    lightning(
      version,
      nested = false,
      code = 'exports.transform = () => "' +
        version +
        '"; exports.Features = { selected: "' +
        version +
        '" };',
    ) {
      const base =
        "node_modules/" +
        (nested ? "@expo/metro-config/node_modules/" : "") +
        "lightningcss/";
      put(
        base + "package.json",
        JSON.stringify({
          name: "lightningcss",
          version,
          exports: { require: "./node/index.js" },
        }),
      );
      put(base + "node/index.js", code);
    },
    load() {
      const loader =
        /** @type {{lightningcssLoader: () => {lightningcss: () => string, Features: {selected: string}}}} */ (
          require(join(root, "loader.cjs"))
        );
      return loader.lightningcssLoader();
    },
  };
}

await test("uses the Expo dependency before the consumer dependency", (t) => {
  const f = fixture(t);
  f.expo();
  f.lightning("1.30.1", true);
  f.lightning("1.30.2");
  const result = f.load();
  assert.equal(result.lightningcss(), "1.30.1");
  assert.deepEqual(result.Features, { selected: "1.30.1" });
});
await test("rejects Expo's blocked version even when the consumer has a good version", (t) => {
  const f = fixture(t);
  f.expo();
  f.lightning("1.30.2", true);
  f.lightning("1.30.1");
  assert.throws(
    () => f.load(),
    /lightningcss version 1\.30\.2 has a critical bug/,
  );
});
await test("rejects the blocked version in a standalone consumer", (t) => {
  const f = fixture(t);
  f.lightning("1.30.2");
  assert.throws(
    () => f.load(),
    /lightningcss version 1\.30\.2 has a critical bug/,
  );
});
await test("standalone consumer loads a supported version", (t) => {
  const f = fixture(t);
  f.lightning("1.30.1");
  assert.equal(f.load().lightningcss(), "1.30.1");
});
await test("Expo without a private dependency uses the hoisted consumer copy", (t) => {
  const f = fixture(t);
  f.expo();
  f.lightning("1.30.1");
  assert.equal(f.load().lightningcss(), "1.30.1");
});
await test("missing compiler reports the engine installation error", (t) => {
  const f = fixture(t);
  f.expo();
  assert.throws(() => f.load(), /unable to determine the path to lightningcss/);
});
await test("native compiler load errors propagate without silently selecting another copy", (t) => {
  const f = fixture(t);
  f.expo();
  f.lightning("1.30.1", true, 'throw new Error("native binding missing");');
  f.lightning("1.30.1");
  assert.throws(() => f.load(), /native binding missing/);
});
await test("later versions are not rejected by the exact version guard", (t) => {
  const f = fixture(t);
  f.lightning("1.30.3");
  assert.equal(f.load().lightningcss(), "1.30.3");
});

await test("missing optional package metadata does not prevent loading", (t) => {
  const f = fixture(t);
  f.put(
    "node_modules/lightningcss.js",
    'exports.transform = () => "custom"; exports.Features = {};',
  );
  assert.equal(f.load().lightningcss(), "custom");
});
