import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const root = String(
  process.env.CSS_COMPONENT_REGISTRY_ROOT ??
    path.resolve(import.meta.dirname, "../.."),
);
const rnSource = fs.readFileSync(require.resolve("react-native"), "utf8");
const rnKeys = [...rnSource.matchAll(/^ {2}get (\w+)\(\) \{/gm)].map((match) =>
  String(match[1]),
);
assert(
  rnKeys.length > 80,
  "React Native export declarations were not recognized",
);
const wrappers = [
  "ActivityIndicator",
  "Button",
  "FlatList",
  "Image",
  "ImageBackground",
  "KeyboardAvoidingView",
  "Pressable",
  "ScrollView",
  "Switch",
  "Text",
  "TextInput",
  "TouchableHighlight",
  "TouchableOpacity",
  "TouchableWithoutFeedback",
  "View",
  "VirtualizedList",
];

/** @param {string} format */
function registry(format) {
  /** @type {string[]} */
  const requests = [];
  /** @type {Map<string, Record<string, unknown>>} */
  const components = new Map();
  /** @type {Record<string, unknown>} */
  const core = Object.fromEntries(
    rnKeys.map((name) => [name, { name, module: "react-native" }]),
  );
  for (const name of wrappers)
    components.set("./" + name, { [name]: { name, module: "./" + name } });
  /** @type {{exports: Record<string, unknown>}} */
  const module = { exports: {} };
  const filename = path.join(root, "dist", format, "components/index.cjs");
  vm.runInNewContext(
    fs.readFileSync(filename, "utf8"),
    {
      module,
      /** @param {string} specifier */
      require(specifier) {
        requests.push(specifier);
        if (specifier === "react-native") return core;
        assert(
          components.has(specifier),
          "Unexpected component module " + specifier,
        );
        return components.get(specifier);
      },
    },
    { filename },
  );
  return { exports: module.exports, requests, components, core };
}

for (const format of ["commonjs", "module"]) {
  void test(
    format +
      " component registry preserves the installed React Native export surface lazily",
    () => {
      const result = registry(format);
      assert.deepEqual(result.requests, []);
      const names = Object.getOwnPropertyNames(result.exports);
      assert.deepEqual(
        rnKeys.filter((name) => !names.includes(name)),
        [],
      );
      for (const name of rnKeys.filter((name) => !wrappers.includes(name))) {
        assert.equal(
          result.exports[name],
          result.core[name],
          "Incorrect core forwarding: " + name,
        );
      }
    },
  );
  void test(
    format +
      " component registry uses every styled wrapper, including TouchableWithoutFeedback",
    () => {
      const result = registry(format);
      for (const name of wrappers) {
        assert.equal(
          result.exports[name],
          result.components.get("./" + name)?.[name],
          "Incorrect wrapper: " + name,
        );
      }
      assert.deepEqual(
        result.requests,
        wrappers.map((name) => "./" + name),
      );
    },
  );
}
