import { pluginTester, type TestObject } from "babel-plugin-tester";

import plugin from "../../babel/import-plugin";

const appendTitles = (tests: TestObject[]) => {
  return tests.map((test) => ({ ...test, title: test.code }));
};

describe("plugin smoke tests", () => {
  pluginTester({
    plugin,
    title: "plugin",
    babelOptions: {
      plugins: ["@babel/plugin-syntax-jsx"],
      filename: "/someFile.js",
    },
    tests: appendTitles([
      {
        code: `import '../global.css';`,
        output: `import "../global.css";`,
      },
      {
        code: `import * as NativeComponentRegistry from '../../NativeComponent/NativeComponentRegistry'`,
        output: `import * as NativeComponentRegistry from "../../NativeComponent/NativeComponentRegistry";`,
        babelOptions: {
          filename:
            "node_modules/react-native/packages/react-native/Libraries/Components/View/ViewNativeComponent.js",
        },
      },
    ]),
  });
});
