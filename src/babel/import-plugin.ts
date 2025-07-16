import { type PluginObj } from "@babel/core";

import {
  type BabelTypes,
  type PluginState,
  allowedModules,
  shouldTransformImport,
  isInsideModule,
  isPackageImport,
  shouldTransformRequire,
} from "./helpers";

export default function ({
  types: t,
}: {
  types: BabelTypes;
}): PluginObj<PluginState> {
  const processed = new WeakSet();

  function importDeclaration(...args: Parameters<typeof t.importDeclaration>) {
    const declaration = t.importDeclaration(...args);
    processed.add(declaration);
    return declaration;
  }

  function requireDeclaration(
    ...args: Parameters<typeof t.variableDeclaration>
  ) {
    const declaration = t.variableDeclaration(...args);
    processed.add(declaration);
    return declaration;
  }

  return {
    name: "Rewrite react-native to react-native-css",
    visitor: {
      ImportDeclaration(path, state): void {
        if (processed.has(path) || processed.has(path.node)) {
          return;
        }

        const { specifiers, source } = path.node;

        if (
          isInsideModule(state.filename, "react-native-css") ||
          !shouldTransformImport(path, state.filename)
        ) {
          return;
        }

        if (specifiers.length === 0) {
          path.replaceWith(
            importDeclaration(
              [],
              t.stringLiteral("react-native-css/components"),
            ),
          );
          path.scope.registerDeclaration(path);
          return;
        }

        const imports = specifiers.map((specifier) => {
          if (t.isImportDefaultSpecifier(specifier)) {
            const name = specifier.local.name;

            if (isPackageImport(path)) {
              return importDeclaration(
                [t.importDefaultSpecifier(specifier.local)],
                t.stringLiteral("react-native-css/components"),
              );
            } else if (allowedModules.has(name)) {
              return importDeclaration(
                [t.importSpecifier(specifier.local, specifier.local)],
                t.stringLiteral(`react-native-css/components/${name}`),
              );
            } else {
              return importDeclaration([specifier], source);
            }
          } else if (t.isImportNamespaceSpecifier(specifier)) {
            return importDeclaration(
              [specifier],
              t.stringLiteral("react-native-css/components"),
            );
          } else {
            const localName = t.isStringLiteral(specifier.imported)
              ? specifier.imported.value
              : specifier.imported.name;

            return allowedModules.has(localName)
              ? importDeclaration(
                  [t.importSpecifier(specifier.local, specifier.imported)],
                  t.stringLiteral(`react-native-css/components/${localName}`),
                )
              : importDeclaration([specifier], source);
          }
        });

        path.replaceInline(imports).map((importPath) => {
          path.scope.registerDeclaration(importPath);
        });
      },
      VariableDeclaration(path, state): void {
        if (processed.has(path) || processed.has(path.node)) {
          return;
        }

        if (
          isInsideModule(state.filename, "react-native-css") ||
          !shouldTransformRequire(t, path.node, state.filename)
        ) {
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const { id, init } = path.node.declarations[0]!;

        if (!t.isObjectPattern(id) || !init) {
          path.replaceWith(
            requireDeclaration(path.node.kind, [
              t.variableDeclarator(
                id,
                t.callExpression(t.identifier("require"), [
                  t.stringLiteral(`react-native-css/components`),
                ]),
              ),
            ]),
          );
          return;
        }

        const imports = id.properties.map((identifier) => {
          if (t.isRestElement(identifier)) {
            return requireDeclaration(path.node.kind, [
              t.variableDeclarator(identifier, init),
            ]);
          }

          if (!t.isIdentifier(identifier.key)) {
            return requireDeclaration(path.node.kind, [
              t.variableDeclarator(t.objectPattern([identifier]), init),
            ]);
          }

          const name = identifier.key.name;

          if (!allowedModules.has(name)) {
            return requireDeclaration(path.node.kind, [
              t.variableDeclarator(
                t.objectPattern([
                  t.objectProperty(
                    t.identifier(name),
                    t.identifier(name),
                    false,
                    true,
                  ),
                ]),
                init,
              ),
            ]);
          }

          return requireDeclaration(path.node.kind, [
            t.variableDeclarator(
              t.objectPattern([
                t.objectProperty(
                  t.identifier(name),
                  t.identifier(name),
                  false,
                  true,
                ),
              ]),
              t.callExpression(t.identifier("require"), [
                t.stringLiteral(`react-native-css/components/${name}`),
              ]),
            ),
          ]);
        });

        path.replaceWithMultiple(imports);
      },
    },
  };
}
