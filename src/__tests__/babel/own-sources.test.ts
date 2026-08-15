import { join, resolve } from "path";

import { transformSync, type PluginObj } from "@babel/core";

import { findPackageRoot } from "../../babel/helpers";
import { transformWithBabelPlugin as transform } from "../_transform";

/**
 * The plugin must never rewrite this package's own components. They import the
 * primitive they wrap — `src/components/View.tsx` opens with
 * `import { View as RNView } from "react-native"` — so a rewrite turns each of
 * them into an import of itself.
 *
 * Metro decides which files those are through two values it supplies to babel
 * (`metro/src/DeltaBundler/Transformer.js` hands the worker
 * `path.relative(projectRoot, filePath)`, and `metro-babel-transformer` sets
 * `cwd: options.projectRoot`): the filename is PROJECT-RELATIVE and the cwd is
 * the project root. Comparing the relative name against an absolute prefix
 * matches nothing, whatever the host.
 */
describe("this package's own sources", () => {
  const packageRoot = findPackageRoot(__dirname);

  test("the package root is this repository", () => {
    // Derived independently of the walk under test: this file sits at
    // <root>/src/__tests__/babel/.
    expect(packageRoot).toBe(resolve(__dirname, "..", "..", ".."));
  });

  test("babel hands a plugin an absolute filename, whatever it was given", () => {
    // The premise the guard rests on. `@babel/core/lib/config/partial.js` stores
    // `path.resolve(cwd, opts.filename)`, so metro's project-relative name is
    // already absolute by the time a visitor runs and the guard needs no
    // resolution of its own. Should that ever change, this fails and says so.
    let seen: string | undefined = undefined;
    const capture = (): PluginObj => ({
      name: "capture-filename",
      visitor: {
        Program(_path, state) {
          seen = state.filename;
        },
      },
    });

    transformSync("", {
      filename: join("src", "components", "View.tsx"),
      cwd: packageRoot,
      configFile: false,
      babelrc: false,
      plugins: [capture],
    });

    expect(seen).toBe(join(packageRoot, "src", "components", "View.tsx"));
  });

  test("a component of this package keeps its react-native import", () => {
    const code = transform(
      `import { View as RNView } from "react-native";`,
      join("src", "components", "View.tsx"),
      { cwd: packageRoot },
    );

    expect(code).toBe(`import { View as RNView } from "react-native";`);
  });

  test("a built component of this package keeps its react-native import", () => {
    // What a consumer's metro actually transforms: this package under their
    // node_modules, named relative to their project root.
    const consumerProjectRoot = resolve(packageRoot, "..", "..");
    const relativeToConsumer = join(
      ...packageRoot.slice(consumerProjectRoot.length + 1).split(/[\\/]/),
      "dist",
      "commonjs",
      "components",
      "View.js",
    );

    const code = transform(
      `import { View as RNView } from "react-native";`,
      relativeToConsumer,
      { cwd: consumerProjectRoot },
    );

    expect(code).toBe(`import { View as RNView } from "react-native";`);
  });

  test("an application file of the same name is still rewritten", () => {
    // The guard is scoped to this package's own directories, not to a filename:
    // an app with its own `components/View.tsx` must keep working.
    const code = transform(
      `import { View as RNView } from "react-native";`,
      join("src", "components", "View.tsx"),
      { cwd: join(packageRoot, "example") },
    );

    expect(code).toBe(
      `import { View as RNView } from "react-native-css/components/View";`,
    );
  });

  test("a sibling directory that merely shares a prefix is not this package", () => {
    // `<root>/src` must not swallow `<root>/src-extra`.
    const code = transform(
      `import { View as RNView } from "react-native";`,
      join("src-extra", "View.tsx"),
      { cwd: packageRoot },
    );

    expect(code).toBe(
      `import { View as RNView } from "react-native-css/components/View";`,
    );
  });
});

describe("without a filename", () => {
  test("babel can transform at all", () => {
    // `PluginPass.filename` is `string | undefined` — babel populates it from
    // `opts.filename`, which a direct `transformSync` caller need not pass.
    // Reading `.startsWith` off it unconditionally throws before any rewrite is
    // even considered.
    expect(() =>
      transform(`import { View } from "react-native";`),
    ).not.toThrow();
  });

  test("nothing is rewritten, because no file can be resolved against", () => {
    expect(transform(`import { View } from "react-native";`)).toBe(
      `import { View } from "react-native";`,
    );
  });
});
