import { transformWithBabelPlugin as transform } from "../_transform";

// Absolute POSIX filenames. `path.resolve` prepends the cwd's drive letter on
// Windows, which changes the prefix of the resolved path but not the two things
// the handlers read from it — whether the package marker is present, and the
// last segment — so every expectation below holds on either host.
const REACT_NATIVE_WEB_DIST = "/project/node_modules/react-native-web/dist";
const REACT_NATIVE_LIBRARIES = "/project/node_modules/react-native/Libraries";

describe("relative imports resolve against the file's directory", () => {
  // `state.filename` is babel's path of the FILE being transformed
  // (`PluginPass.filename` is `file.opts.filename`, and babel derives
  // `sourceFileName` from `basename(filenameRelative)`), so a relative source
  // resolves against `dirname(filename)`. Resolving against the filename itself
  // consumes one `..` too few, which moves the package boundary by one directory.

  test("react-native-web: an import that leaves dist is not a dist internal", () => {
    // `../../../View` from `dist/exports/View/index.js` lands on
    // `react-native-web/View` — outside `dist`, so not a component this plugin
    // owns. Resolved against the filename it lands on `dist/View` instead, and
    // the plugin swaps a module the author never asked for.
    const code = transform(
      `import View from "../../../View";`,
      `${REACT_NATIVE_WEB_DIST}/exports/View/index.js`,
    );

    expect(code).toBe(`import View from "../../../View";`);
  });

  test("react-native-web: a sibling importing its own directory index is rewritten", () => {
    // `.` from `dist/exports/View/types.js` is the directory `dist/exports/View`,
    // whose index IS react-native-web's View. Resolved against the filename it is
    // `types.js`, which is in no component census, so the rewrite is missed.
    const code = transform(
      `import View from ".";`,
      `${REACT_NATIVE_WEB_DIST}/exports/View/types.js`,
    );

    expect(code).toBe(
      `import { View } from "react-native-css/components/View";`,
    );
  });

  test("react-native: an import that leaves Libraries/Components is not a component", () => {
    // `../../View` from `Libraries/Components/View/View.js` lands on
    // `react-native/Libraries/View`, which is not under `Components/`.
    const code = transform(
      `import View from "../../View";`,
      `${REACT_NATIVE_LIBRARIES}/Components/View/View.js`,
    );

    expect(code).toBe(`import View from "../../View";`);
  });

  test("both handlers place the package boundary at the same depth", () => {
    // The two handlers resolve the same way or they do not; this pins that they
    // do, at the one depth where an off-by-one base is observable. Each source
    // climbs exactly out of its package's marker directory.
    const web = transform(
      `import View from "../../../View";`,
      `${REACT_NATIVE_WEB_DIST}/exports/View/index.js`,
    );
    const native = transform(
      `import View from "../../View";`,
      `${REACT_NATIVE_LIBRARIES}/Components/View/View.js`,
    );

    expect(web).toBe(`import View from "../../../View";`);
    expect(native).toBe(`import View from "../../View";`);
  });
});

describe("relative imports inside a package are rewritten", () => {
  test("react-native-web: a sibling component", () => {
    const code = transform(
      `import View from "../View";`,
      `${REACT_NATIVE_WEB_DIST}/exports/ScrollView/index.js`,
    );

    expect(code).toBe(
      `import { View } from "react-native-css/components/View";`,
    );
  });

  test("react-native-web: a require() of a sibling component", () => {
    const code = transform(
      `const View = _interopRequireDefault(require("../View"));`,
      `${REACT_NATIVE_WEB_DIST}/exports/ScrollView/index.js`,
    );

    expect(code).toBe(
      `const {\n  View\n} = require("react-native-css/components/View");`,
    );
  });

  test("react-native: a sibling component", () => {
    const code = transform(
      `import View from "../View/View";`,
      `${REACT_NATIVE_LIBRARIES}/Components/ScrollView/ScrollView.js`,
    );

    expect(code).toBe(
      `import { View } from "react-native-css/components/View";`,
    );
  });

  test("a module outside either package is left alone", () => {
    const code = transform(
      `import View from "../View";`,
      `/project/src/screens/Home.js`,
    );

    expect(code).toBe(`import View from "../View";`);
  });
});

describe("package-level specifiers", () => {
  const APP_FILE = "/project/src/screens/Home.js";

  test("react-native-web: only the specifiers with a component are moved", () => {
    const code = transform(
      `import { View, Text, StyleSheet, Dimensions } from "react-native-web";`,
      APP_FILE,
    );

    expect(code).toBe(
      [
        `import { View } from "react-native-css/components/View";`,
        `import { Text } from "react-native-css/components/Text";`,
        `import { StyleSheet } from "react-native-web";`,
        `import { Dimensions } from "react-native-web";`,
      ].join("\n"),
    );
  });

  test("react-native: a deep path outside Libraries/Components still names its component", () => {
    // Not a relative source, so no resolution happens — the last segment of the
    // specifier is the component name.
    const code = transform(
      `import { View } from "react-native/lib/components/View";`,
      APP_FILE,
    );

    expect(code).toBe(
      `import { View } from "react-native-css/components/View";`,
    );
  });
});
