/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { readdirSync } from "fs";
import { dirname, join, normalize, parse, resolve, sep } from "path";
import { type NodePath } from "@babel/traverse";

import t from "@babel/types";

export type BabelTypes = typeof t;

export interface PluginOpts {
  target?: string;
  runtime?: string;
  commonjs?: boolean;
}

export interface PluginState {
  opts?: PluginOpts;
  filename: string;
}

export const allowedModules = new Set(
  getFilesWithoutExtension(join(__dirname, "../components")),
);

function getFilesWithoutExtension(dirPath: string) {
  // Read all files and directories inside dirPath synchronously
  const entries = readdirSync(dirPath, { withFileTypes: true });

  // Filter only files (ignore directories)
  const files = entries.filter(
    (entry) =>
      entry.isFile() &&
      /\.[jt]sx?$/.exec(entry.name) &&
      !/index\.[jt]sx?$/.exec(entry.name),
  );

  // For each file, get the filename without extension
  const filesWithoutExt = files.map((file) => parse(file.name).name);

  return filesWithoutExt;
}

export function isInsideModule(filename: string, module: string): boolean {
  const normalized = normalize(filename);

  // Match exact module name
  if (normalized === module) {
    return true;
  }

  // Absolute posix paths
  if (normalized.startsWith(`${module}/`)) {
    return true;
  }

  // Check for our local development structure
  if (normalized.includes(`${sep}${module}${sep}src${sep}`)) {
    // Ignore the test files
    return !normalized.includes("__tests__");
  }

  // Match classic node_modules
  if (normalized.includes(`${sep}node_modules${sep}${module}${sep}`)) {
    return true;
  }

  // Match Yarn PnP .zip-style paths (e.g., .zip/node_modules/${module}/)
  if (
    normalized.includes(`${sep}.zip${sep}node_modules${sep}${module}${sep}`)
  ) {
    return true;
  }

  // Match Yarn .yarn/cache/${module}/*
  if (normalized.includes(`${sep}.yarn${sep}cache${sep}${module}${sep}`)) {
    return true;
  }

  return false;
}

export function isPackageImport(
  path: NodePath<t.ImportDeclaration | t.ExportNamedDeclaration>,
) {
  const source = path.node.source?.value;
  if (!source) {
    return false;
  }

  return source === "react-native" || source === "react-native-web";
}

export function shouldTransformImport(
  path: NodePath<t.ImportDeclaration | t.ExportNamedDeclaration>,
  filename: string,
) {
  let source = path.node.source?.value;

  if (!source) {
    return false;
  }

  if (source.startsWith(".")) {
    source = resolve(dirname(filename), source);
  }

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return isReactNativeSource(source) || isReactNativeWebSource(source);
}

function isReactNativeSource(source: string) {
  if (source === "react-native") return true;

  const components = source.split(
    `react-native${sep}Libraries${sep}Components${sep}`,
  );

  if (components.length > 1) {
    const component = components[1]?.split(sep)[0];
    return component && allowedModules.has(component);
  }

  return false;
}

function isReactNativeWebSource(source: string) {
  if (source === "react-native-web") return true;

  let components = source.split(
    `react-native-web${sep}dist${sep}commonjs${sep}exports${sep}`,
  );
  if (components.length > 1) {
    const component = components[1]?.split(sep)[0];
    return component && allowedModules.has(component);
  }

  components = source.split(
    `react-native-web${sep}dist${sep}module${sep}exports${sep}`,
  );
  if (components.length > 1) {
    const component = components[1]?.split(sep)[0];
    return component && allowedModules.has(component);
  }

  return false;
}

export function shouldTransformRequire(
  t: BabelTypes,
  node: t.VariableDeclaration,
  basePath: string,
) {
  const { declarations } = node;

  const declaration = declarations[0];

  if (declarations.length > 1 || !declaration) {
    return false;
  }
  const { id, init } = declaration;

  let source =
    (t.isObjectPattern(id) || t.isIdentifier(id)) &&
    t.isCallExpression(init) &&
    t.isIdentifier(init.callee) &&
    init.callee.name === "require" &&
    init.arguments.length === 1 &&
    "value" in init.arguments[0]! &&
    typeof init.arguments[0].value === "string" &&
    init.arguments[0].value;

  if (!source) {
    return false;
  }

  if (source.startsWith(".")) {
    source = resolve(basePath, source);
  }

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return isReactNativeSource(source) || isReactNativeWebSource(source);
}
