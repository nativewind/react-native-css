import { pluginTester } from "babel-plugin-tester";

import plugin from "../../babel/import-plugin";

pluginTester({
  plugin,
  title: "plugin",
  babelOptions: {
    plugins: ["@babel/plugin-syntax-jsx"],
    filename: "/someFile.js",
  },
  tests: {
    "rewrite imports from within React Native": {
      only: true,
      code: `import View from '../View/View';`,
      output: `import { View } from "react-native-css/dist/module/components/View";`,
      babelOptions: {
        filename:
          "node_modules/react-native/Libraries/Components/ScrollView/ScrollView.js",
      },
    },
    "rewrite react-native imports": {
      code: `import { View, Text, StyleSheet, Dimensions } from "react-native";`,
      output: `import { View } from "react-native-css/dist/module/components/View";
import { Text } from "react-native-css/dist/module/components/Text";
import { StyleSheet } from "react-native";
import { Dimensions } from "react-native";`,
    },
    "rewrite react-native deep imports": {
      code: `import { View } from "react-native/lib/components/View";`,
      output: `import { View } from "react-native-css/dist/module/components/View";`,
    },
    "rewrite react-native-web imports": {
      code: `import { View, Text, StyleSheet, Dimensions } from "react-native-web";`,
      output: `import { View } from "react-native-css/dist/module/components/View";
import { Text } from "react-native-css/dist/module/components/Text";
import { StyleSheet } from "react-native-web";
import { Dimensions } from "react-native-web";`,
    },
    "rewrite react-native-web deep imports": {
      code: `import { View } from "react-native-web/lib/components/View";`,
      output: `import { View } from "react-native-css/dist/module/components/View";`,
    },
  },
});
