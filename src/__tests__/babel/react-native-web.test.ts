import { pluginTester, type TestObject } from "babel-plugin-tester";

import plugin from "../../babel/import-plugin";

const appendTitles = (tests: TestObject[]) => {
  return tests.map((test) => ({ ...test, title: test.code }));
};

describe("react-native-web", () => {
  pluginTester({
    plugin,
    title: "plugin",
    babelOptions: {
      plugins: ["@babel/plugin-syntax-jsx"],
    },
    tests: appendTitles([
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
        output: `const { Text: _Text } = require("react-native-css/components/Text");`,
      },
      {
        code: `const _Text = _interopRequireDefault(require('react-native-web/dist/modules/Text'));`,
        output: `const { Text: _Text } = require("react-native-css/components/Text");`,
      },
      {
        code: `const _Text = _interopRequireDefault(require('react-native-web/dist/cjs/Text'));`,
        output: `const { Text: _Text } = require("react-native-css/components/Text");`,
      },
      {
        code: `const View = _interopRequireDefault(require('../View'));`,
        output: `const { View } = require("react-native-css/components/View");`,
        babelOptions: {
          filename: "react-native-web/dist/modules/ScrollView/index.js",
        },
      },
    ]),
  });
});
