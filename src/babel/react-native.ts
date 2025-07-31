import { dirname, resolve } from "path";

import { type NodePath } from "@babel/traverse";
import tBabelTypes, {
  type ImportDeclaration,
  type ObjectPattern,
  type Statement,
  type VariableDeclaration,
} from "@babel/types";

import { allowedModules } from "./allowedModules";

type BabelTypes = typeof tBabelTypes;

function parseReactNativeSource(source: string, filename: string) {
  if (source.startsWith(".")) {
    source = resolve(dirname(filename), source);

    const internalPath = source.split("react-native/Libraries/Components/")[1];
    if (!internalPath) {
      return;
    }

    // Strip the absolute system filepath
    source = `react-native/Libraries/Components/${internalPath}`;
  }

  if (source === "react-native") {
    return { source: "react-native-css/components" };
  } else if (source.startsWith("react-native/")) {
    const name = source.split("/").at(-1);
    if (!name || !allowedModules.has(name)) {
      return;
    }

    return {
      source: `react-native-css/components/${name}`,
      name,
    };
  }

  return;
}

export function handleReactNativeImport(
  declaration: ImportDeclaration,
  t: BabelTypes,
  filename: string,
): Statement[] | undefined {
  const { specifiers, source } = declaration;

  const rnwSource = parseReactNativeSource(source.value, filename);
  if (!rnwSource) {
    return;
  }

  if (specifiers.length === 0) {
    return [
      t.importDeclaration([], t.stringLiteral("react-native-css/components")),
    ];
  }

  const statements: Statement[] = [];

  for (const specifier of specifiers) {
    if (t.isImportDefaultSpecifier(specifier)) {
      const { source: newSource, name } = rnwSource;

      if (!name) {
        statements.push(
          t.importDeclaration(
            [t.importDefaultSpecifier(specifier.local)],
            t.stringLiteral(newSource),
          ),
        );
      } else {
        statements.push(
          t.importDeclaration(
            [t.importSpecifier(specifier.local, specifier.local)],
            t.stringLiteral(`react-native-css/components/${name}`),
          ),
        );
      }
    } else if (t.isImportNamespaceSpecifier(specifier)) {
      statements.push(
        t.importDeclaration(
          [specifier],
          t.stringLiteral("react-native-css/components"),
        ),
      );
    } else {
      const localName = t.isStringLiteral(specifier.imported)
        ? specifier.imported.value
        : specifier.imported.name;

      if (!allowedModules.has(localName)) {
        statements.push(t.importDeclaration([specifier], source));
      } else {
        statements.push(
          t.importDeclaration(
            [t.importSpecifier(specifier.local, specifier.imported)],
            t.stringLiteral(`react-native-css/components/${localName}`),
          ),
        );
      }
    }
  }

  return statements;
}

export function handleReactNativeIdentifierRequire(
  path: NodePath<VariableDeclaration>,
  t: BabelTypes,
  id: string,
  source: string,
  filename: string,
) {
  const parsedSource = parseReactNativeSource(source, filename);

  if (!parsedSource) {
    return;
  }

  const { source: newSource, name } = parsedSource;

  if (name) {
    return [
      t.variableDeclaration(path.node.kind, [
        t.variableDeclarator(
          t.objectPattern([
            name === id
              ? t.objectProperty(
                  t.identifier(name),
                  t.identifier(id),
                  false,
                  true,
                )
              : t.objectProperty(t.identifier(name), t.identifier(id)),
          ]),
          t.callExpression(t.identifier("require"), [
            t.stringLiteral(newSource),
          ]),
        ),
      ]),
    ];
  } else {
    return [
      t.variableDeclaration(path.node.kind, [
        t.variableDeclarator(
          t.identifier(id),
          t.callExpression(t.identifier("require"), [
            t.stringLiteral(newSource),
          ]),
        ),
      ]),
    ];
  }
}

export function handleReactNativeObjectPatternRequire(
  path: NodePath<VariableDeclaration>,
  t: BabelTypes,
  id: ObjectPattern,
  source: string,
  filename: string,
) {
  const parsedSource = parseReactNativeSource(source, filename);

  // Don't handle `const { Text } = require('react-native/Libraries/Text/Text');` - we only handle package exports
  if (!parsedSource || parsedSource.name) {
    return;
  }

  const statements: Statement[] = [];

  for (const identifier of id.properties) {
    if (t.isRestElement(identifier)) {
      // Bail out on `const { ...rest } = require('react-native');`
      // We need to exit as we do not handle `const { Text, ...rest } = require('react-native');`
      return;
    } else if (
      !(t.isIdentifier(identifier.value) && t.isIdentifier(identifier.key))
    ) {
      // Bail out on anything that isn't `const { <key>: <identifier> } = require('react-native');`
      return;
    } else {
      const name = identifier.key.name;

      if (!allowedModules.has(name)) {
        statements.push(
          t.variableDeclaration(path.node.kind, [
            t.variableDeclarator(
              t.objectPattern([identifier]),
              t.callExpression(t.identifier("require"), [
                t.stringLiteral(source),
              ]),
            ),
          ]),
        );
      } else {
        const newSourceWithName = `react-native-css/components/${name}`;

        statements.push(
          t.variableDeclaration(path.node.kind, [
            t.variableDeclarator(
              t.objectPattern([
                t.objectProperty(
                  t.identifier(name),
                  t.identifier(identifier.value.name),
                  false,
                  true,
                ),
              ]),
              t.callExpression(t.identifier("require"), [
                t.stringLiteral(newSourceWithName),
              ]),
            ),
          ]),
        );
      }
    }
  }

  return statements;
}
