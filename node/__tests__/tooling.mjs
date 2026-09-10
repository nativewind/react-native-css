import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);

await test("Node ESM compiler uses the CommonJS compiler", async () => {
  const esm = await import("react-native-css/compiler");
  const commonjs = require("react-native-css/compiler");
  assert.equal(esm.compile, commonjs.compile);
  const result = esm.compile(".probe { width: 37px }").stylesheet();
  assert.equal(result.s[0][0], "probe");
  assert.equal(result.s[0][1][0].d[0].width, 37);
});

await test("Node ESM Metro accepts object and lazy configurations", async () => {
  const esm = await import("react-native-css/metro");
  const commonjs = require("react-native-css/metro");
  assert.equal(esm.withReactNativeCSS, commonjs.withReactNativeCSS);
  const config = { resolver: { sourceExts: ["js"] }, marker: 37 };
  const options = { disableTypeScriptGeneration: true };
  const output = esm.withReactNativeCSS(config, options);
  assert.equal(output.marker, 37);
  assert.deepEqual(output.resolver.sourceExts, ["js", "css"]);
  let calls = 0;
  const lazy = esm.withReactNativeCSS(() => {
    calls++;
    return Promise.resolve(config);
  }, options);
  assert.equal(calls, 0);
  assert.equal((await lazy()).marker, 37);
  assert.equal(calls, 1);
});

await test("Node ESM Babel default remains callable and rewrites imports", async () => {
  const esm = await import("react-native-css/babel");
  const commonjs = require("react-native-css/babel");
  assert.equal(esm.default, commonjs.default);
  const preset = esm.default();
  assert.equal(typeof preset.plugins[0], "function");
  assert(preset.plugins.includes("react-native-worklets/plugin"));
  const babel = require("@babel/core");
  const result = await babel.transformAsync(
    'import { View } from "react-native";',
    {
      filename: "/tmp/node-tooling-consumer.js",
      babelrc: false,
      configFile: false,
      presets: [esm.default],
    },
  );
  assert.match(result.code, /react-native-css\/components/);
});
