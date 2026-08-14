import { join, sep } from "path";

import { type PluginObj } from "@babel/core";
import type { Statement } from "@babel/types";

import {
  findPackageRoot,
  getInteropRequireDefaultSource,
  type BabelTypes,
  type PluginState,
} from "./helpers";
import {
  handleReactNativeIdentifierRequire,
  handleReactNativeImport,
  handleReactNativeObjectPatternRequire,
} from "./react-native";
import {
  handleReactNativeWebIdentifierRequire,
  handleReactNativeWebImport,
  handleReactNativeWebObjectPatternRequire,
} from "./react-native-web";

export default function ({
  types: t,
}: {
  types: BabelTypes;
}): PluginObj<PluginState> {
  // Nodes this plugin generated. `replaceWithMultiple` requeues its replacements,
  // so a rewrite that reproduces its own input — `const { Platform } =
  // require("react-native")` — would otherwise be visited and rewritten forever.
  // The set holds `Statement` nodes, never the `NodePath`s wrapping them, and the
  // element type says so: `processed.has(path)` is a compile error, not a
  // disjunct that is quietly always false.
  const processed = new WeakSet<Statement>();

  // This package's own components import the primitive they wrap, so rewriting
  // one turns it into an import of itself. These are the two directories it
  // ships (`package.json`'s `files`), each with a trailing separator so a
  // sibling like `<root>/src-extra` is not swallowed by the prefix.
  const packageRoot = findPackageRoot(__dirname);
  const ownDirectories = [
    join(packageRoot, "dist") + sep,
    join(packageRoot, "src") + sep,
  ];

  /**
   * `filename` is already absolute: babel stores `path.resolve(cwd, opts.filename)`
   * (`@babel/core/lib/config/partial.js`), so metro handing it a project-relative
   * name (`metro/src/DeltaBundler/Transformer.js` passes
   * `path.relative(projectRoot, filePath)`) still arrives here resolved against
   * `cwd`, which `metro-babel-transformer` sets to the project root. Both sides of
   * the comparison are OS-native absolute paths, so no separator normalization
   * belongs here.
   */
  function isFromThisModule(filename: string): boolean {
    return ownDirectories.some((directory) => filename.startsWith(directory));
  }

  return {
    name: "Rewrite react-native to react-native-css",
    visitor: {
      ImportDeclaration(path, state): void {
        const { filename } = state;

        // Without a filename nothing can be resolved against, and the guard below
        // has nothing to compare. `PluginPass.filename` is `string | undefined`
        // precisely because a direct `transformSync` caller need not supply one.
        if (
          filename === undefined ||
          processed.has(path.node) ||
          isFromThisModule(filename)
        ) {
          return;
        }

        const statements =
          handleReactNativeImport(path.node, t, filename) ??
          handleReactNativeWebImport(path.node, t, filename);

        if (!statements) {
          return;
        }

        for (const statement of statements) {
          processed.add(statement);
        }

        path.replaceWithMultiple(statements);
      },
      VariableDeclaration(path, state): void {
        const { filename } = state;

        if (
          filename === undefined ||
          processed.has(path.node) ||
          isFromThisModule(filename)
        ) {
          return;
        }

        const firstDeclaration = path.node.declarations.at(0);

        // We only handle single variable declarations for now.
        if (path.node.declarations.length > 1) {
          return;
        }

        // Skip declarations that are not initialized. eg `let x;`
        if (!firstDeclaration?.init) {
          return;
        }

        const { id, init } = firstDeclaration;

        // We only handle `const <id> = <init>()`
        if (!t.isCallExpression(init)) {
          return;
        }

        // We only handle `const id = <init>() OR const { <id> } = <init>()`
        if (!(t.isIdentifier(id) || t.isObjectPattern(id))) {
          return;
        }

        const initArg = init.arguments.at(0);

        if (!initArg) {
          return;
        }

        let statements: Statement[] | undefined;

        // `const <id> = require(<source>);`
        if (
          t.isIdentifier(id) &&
          t.isIdentifier(init.callee, { name: "require" }) &&
          t.isStringLiteral(initArg)
        ) {
          statements =
            handleReactNativeIdentifierRequire(
              path,
              t,
              id.name,
              initArg.value,
              filename,
            ) ??
            handleReactNativeWebIdentifierRequire(
              path,
              t,
              id.name,
              initArg.value,
              filename,
            );
        } else if (
          t.isObjectPattern(id) &&
          t.isIdentifier(init.callee, { name: "require" }) &&
          t.isStringLiteral(initArg)
        ) {
          statements =
            handleReactNativeObjectPatternRequire(
              path,
              t,
              id,
              initArg.value,
              filename,
            ) ??
            handleReactNativeWebObjectPatternRequire(
              path,
              t,
              id,
              initArg.value,
              filename,
            );
        } else if (
          t.isIdentifier(id) &&
          t.isIdentifier(init.callee, { name: "_interopRequireDefault" })
        ) {
          // `const <id> = _interopRequireDefault(require(<source>));`
          const source = getInteropRequireDefaultSource(init, t);
          if (!source) {
            return;
          }
          statements = handleReactNativeWebIdentifierRequire(
            path,
            t,
            id.name,
            source,
            filename,
          );
        }

        if (!statements) {
          return;
        }

        for (const statement of statements) {
          processed.add(statement);
        }

        path.replaceWithMultiple(statements);
      },
    },
  };
}
