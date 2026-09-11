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

describe("react-native", () => {
  pluginTester({
    plugin,
    title: "plugin",
    babelOptions: {
      plugins: ["@babel/plugin-syntax-jsx"],
      filename: "/someFile.js",
    },
    tests: appendTitles([
      {
        code: `import typeof View from 'react-native';`,
        output: `import typeof View from "react-native";`,
        babelOptions: { parserOpts: { plugins: ["flow"] } },
        formatResult: (code) => format(code, { parser: "babel-flow" }),
      },
      {
        code: `import { type View, Text } from 'react-native';`,
        output: `import { type View } from "react-native";
import { Text } from "react-native-css/components/Text";`,
        babelOptions: { parserOpts: { plugins: ["typescript"] } },
      },
      {
        code: `import type { View } from 'react-native';`,
        output: `import type { View } from "react-native";`,
        babelOptions: { parserOpts: { plugins: ["typescript"] } },
      },
      {
        code: `import NativeView from 'react-native/Libraries/Components/View/View';`,
        output: `import { View as NativeView } from "react-native-css/components/View";`,
      },
      {
        code: `import 'react-native';`,
        output: `import "react-native-css/components";`,
      },
      {
        code: `import ReactNative from 'react-native';`,
        output: `import ReactNative from "react-native-css/components";`,
      },
      {
        code: `import { Platform } from 'react-native';`,
        output: `import { Platform } from "react-native";`,
      },
      {
        code: `import ReactNative, { Text } from 'react-native';`,
        output: `import ReactNative from "react-native-css/components";
import { Text } from "react-native-css/components/Text";`,
      },
      {
        code: `import { View as RNView } from 'react-native';`,
        output: `import { View as RNView } from "react-native-css/components/View";`,
      },
      {
        code: `import ReactNative, { Text, Platform } from 'react-native';`,
        output: `import ReactNative from "react-native-css/components";
import { Text } from "react-native-css/components/Text";
import { Platform } from "react-native";`,
      },
      {
        code: `import View from '../View/View';`,
        output: `import { View } from "react-native-css/components/View";`,
        babelOptions: {
          filename:
            "react-native/Libraries/Components/ScrollView/ScrollView.js",
        },
      },
      {
        code: `const { View } = require('react-native');`,
        output: `const { View } = require("react-native-css/components/View");`,
      },
      {
        code: `const { Platform, View } = require('react-native');`,
        output: `const { Platform } = require("react-native");\nconst { View } = require("react-native-css/components/View");`,
      },
      {
        code: `const ReactNative = require('react-native');`,
        output: `const ReactNative = require("react-native-css/components");`,
      },
    ]),
  });
});
