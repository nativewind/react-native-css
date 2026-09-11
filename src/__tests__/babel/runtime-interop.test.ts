import { resolve } from "node:path";
import { transformSync } from "@babel/core";

import plugin from "../../babel/import-plugin";

const component = () => null;
function execute(
  source: string,
  modules: Record<string, unknown>,
  filename = "/consumer/index.js",
) {
  const output = transformSync(source, {
    configFile: false,
    babelrc: false,
    filename,
    plugins: [plugin],
  })?.code;
  expect(output).toBeDefined();
  if (output === undefined || output === null)
    throw new Error("Missing transformed output");
  const module = { exports: {} };
  // Execute emitted CommonJS against explicit module identities.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const run = new Function("require", "module", output) as (
    require: (id: string) => unknown,
    module: { exports: unknown },
  ) => void;
  run((id: string) => {
    if (!(id in modules)) throw new Error(`Unexpected import ${id}`);
    return modules[id];
  }, module);
  return module.exports;
}

test.each([
  "react-native-web/dist/Text",
  "react-native-web/dist/cjs/Text",
  "react-native-web/dist/modules/Text",
])("preserves default interop for %s", (source) => {
  expect(
    execute(
      `function _interopRequireDefault(value) { return value && value.__esModule ? value : { default: value }; }
       const Text = _interopRequireDefault(require(${JSON.stringify(source)}));
       module.exports = Text.default;`,
      {
        "react-native-css/components/Text": {
          __esModule: true,
          default: component,
          Text: component,
        },
      },
    ),
  ).toBe(component);
});

test("preserves the default wrapper for a CommonJS component", () => {
  expect(
    execute(
      `function _interopRequireDefault(value) { return value && value.__esModule ? value : { default: value }; }
       const Text = _interopRequireDefault(require("react-native-web/dist/Text"));
       module.exports = Text.default;`,
      { "react-native-css/components/Text": component },
    ),
  ).toBe(component);
});

test.each(["react-native", "react-native-web"])(
  "preserves computed destructuring keys in %s",
  (source) => {
    expect(
      execute(
        `const View = "Text";
         const { [View]: Selected } = require(${JSON.stringify(source)});
         module.exports = Selected;`,
        { [source]: { Text: component } },
      ),
    ).toBe(component);
  },
);

test.each([
  'const { Text, ...other } = require("react-native"); module.exports = Text;',
  'const { Text = null } = require("react-native"); module.exports = Text;',
  'const Text = require("react-native").Text; module.exports = Text;',
  'const { Text } = require("react-native"), other = 1; module.exports = Text;',
  'let Text; Text = require("react-native").Text; module.exports = Text;',
  'const name = "react-native"; const { Text } = require(name); module.exports = Text;',
])("preserves unsupported dynamic or combined declaration: %s", (source) => {
  expect(execute(source, { "react-native": { Text: component } })).toBe(
    component,
  );
});

test("does not rewrite the package own source imports", () => {
  expect(
    execute(
      'const { Text } = require("react-native"); module.exports = Text;',
      { "react-native": { Text: component } },
      resolve(__dirname, "../../components/Text.tsx"),
    ),
  ).toBe(component);
});

test.each(["react-native", "react-native-web"])(
  "does not rewrite a locally bound require for %s",
  (name) => {
    expect(
      execute(
        `function load(require) {
      const { Text } = require(${JSON.stringify(name)});
      return Text;
    }
    module.exports = load(name => ({ Text: name === ${JSON.stringify(name)} ? 37 : 99 }));`,
        {},
      ),
    ).toBe(37);
  },
);
