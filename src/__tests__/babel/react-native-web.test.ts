import { pluginTester, type TestObject } from "babel-plugin-tester";

import { format } from "prettier";

import plugin from "../../babel/import-plugin";

const appendTitles = (tests: TestObject[]) => {
  return tests.map((test) => ({
    ...test,
    title: test.code,
    babelOptions: { filename: "/consumer/component.js", ...test.babelOptions },
  }));
};

describe("react-native-web", () => {
  pluginTester({
    plugin,
    title: "plugin",
    babelOptions: {
      plugins: ["@babel/plugin-syntax-jsx"],
    },
    tests: appendTitles([
      {
        code: `import typeof View from 'react-native-web';`,
        output: `import typeof View from "react-native-web";`,
        babelOptions: { parserOpts: { plugins: ["flow"] } },
        formatResult: (code) => format(code, { parser: "babel-flow" }),
      },
      {
        code: `import { type View, Text } from 'react-native-web';`,
        output: `import { type View } from "react-native-web";
import { Text } from "react-native-css/components/Text";`,
        babelOptions: { parserOpts: { plugins: ["typescript"] } },
      },
      {
        code: `import type { View } from 'react-native-web';`,
        output: `import type { View } from "react-native-web";`,
        babelOptions: { parserOpts: { plugins: ["typescript"] } },
      },
      {
        code: `import NativeView from 'react-native-web/dist/exports/View';`,
        output: `import { View as NativeView } from "react-native-css/components/View";`,
      },
      /* import tests */
      {
        code: `import 'react-native-web';`,
        output: `import "react-native-css/components";`,
      },
      {
        code: `import ReactNativeWeb from 'react-native-web';`,
        output: `import ReactNativeWeb from "react-native-css/components";`,
      },
      {
        code: `import { View } from 'react-native-web';`,
        output: `import { View } from "react-native-css/components/View";`,
      },
      {
        code: `import View from 'react-native-web/dist/cjs/View';`,
        output: `import { View } from "react-native-css/components/View";`,
      },
      {
        code: `import View from 'react-native-web/dist/modules/View';`,
        output: `import { View } from "react-native-css/components/View";`,
      },
      {
        code: `import View from '../View';`,
        output: `import { View } from "react-native-css/components/View";`,
        babelOptions: {
          filename: "react-native-web/dist/modules/ScrollView/index.js",
        },
      },

      /* require() tests */
      {
        code: `const { Text } = require('react-native-web');`,
        output: `const { Text } = require("react-native-css/components/Text");`,
      },
      {
        code: `const Text = require('react-native-web/dist/modules/Text');`,
        output: `const { Text } = require("react-native-css/components/Text");`,
      },
      {
        code: `const _Text = require('react-native-web/dist/modules/Text');`,
        output: `const { Text: _Text } = require("react-native-css/components/Text");`,
      },
      {
        code: `const Text = require('react-native-web/dist/cjs/Text');`,
        output: `const { Text } = require("react-native-css/components/Text");`,
      },
      {
        code: `const _Text = require('react-native-web/dist/cjs/Text');`,
        output: `const { Text: _Text } = require("react-native-css/components/Text");`,
      },
      {
        code: `const Text = require('react-native-web/dist/exports/Text');`,
        output: `const { Text } = require("react-native-css/components/Text");`,
      },
      {
        code: `const _Text = require('react-native-web/dist/exports/Text');`,
        output: `const { Text: _Text } = require("react-native-css/components/Text");`,
      },
      {
        code: `const _Text = _interopRequireDefault(require('react-native-web/dist/Text'));`,
        output: `const _Text = _interopRequireDefault(
  require("react-native-css/components/Text"),
);`,
      },
      {
        code: `const _Text = _interopRequireDefault(require('react-native-web/dist/modules/Text'));`,
        output: `const _Text = _interopRequireDefault(
  require("react-native-css/components/Text"),
);`,
      },
      {
        code: `const _Text = _interopRequireDefault(require('react-native-web/dist/cjs/Text'));`,
        output: `const _Text = _interopRequireDefault(
  require("react-native-css/components/Text"),
);`,
      },
      {
        code: `const View = _interopRequireDefault(require('../View'));`,
        output: `const View = _interopRequireDefault(
  require("react-native-css/components/View"),
);`,
        babelOptions: {
          filename: "react-native-web/dist/modules/ScrollView/index.js",
        },
      },
    ]),
  });
});
