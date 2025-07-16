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
      {
        code: `import 'react-native-web';`,
        output: `import "react-native-css/components";`,
      },
      {
        code: `import { View } from 'react-native-web';`,
        output: `import { View } from "react-native-css/components/View";`,
      },
      {
        code: `import View from 'react-native-web/dist/commonjs/exports/View';`,
        output: `import { View } from "react-native-css/components/View";`,
      },
      {
        code: `import View from 'react-native-web/dist/module/exports/View';`,
        output: `import { View } from "react-native-css/components/View";`,
      },
      {
        code: `import View from '../View';`,
        output: `import { View } from "react-native-css/components/View";`,
        babelOptions: {
          filename: "react-native-web/dist/module/exports/ScrollView/index.js",
        },
      },
    ]),
  });
});
