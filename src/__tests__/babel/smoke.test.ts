import { pluginTester, type TestObject } from "babel-plugin-tester";

import plugin from "../../babel/import-plugin";

const appendTitles = (tests: TestObject[]) => {
  return tests.map((test) => ({ ...test, title: test.code }));
};

describe("plugin smoke tests", () => {
  pluginTester({
    plugin,
    title: "plugin",
    // An application file, not one of this package's own sources: the plugin skips
    // everything under `<packageRoot>/src` and `<packageRoot>/dist`, and a test
    // file IS under `src`. babel-plugin-tester feeds `filepath` to babel as
    // `filename`, inferring this test file's own path when it is not set, so
    // `babelOptions.filename` alone never reaches the plugin.
    filepath: "/project/src/App.js",
    babelOptions: {
      plugins: ["@babel/plugin-syntax-jsx"],
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
