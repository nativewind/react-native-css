import { existsSync, readFileSync } from "fs";
import { dirname, join, resolve, sep } from "path";

import tBabelTypes, { type CallExpression } from "@babel/types";

export type BabelTypes = typeof tBabelTypes;

export interface PluginOpts {
  target?: string;
  runtime?: string;
  commonjs?: boolean;
}

export interface PluginState {
  opts?: PluginOpts;
  /**
   * Babel's `PluginPass.filename` is `string | undefined`: absolute when
   * `opts.filename` was given (babel resolves it against `cwd`), and `undefined`
   * when a `transformSync` caller passed none.
   */
  filename: string | undefined;
}

export function getInteropRequireDefaultSource(
  init: CallExpression,
  t: BabelTypes,
) {
  if (!t.isIdentifier(init.callee, { name: "_interopRequireDefault" })) {
    return;
  }

  const interopArg = init.arguments.at(0);

  if (
    !t.isCallExpression(interopArg) ||
    !t.isIdentifier(interopArg.callee, { name: "require" })
  ) {
    return;
  }

  const requireArg = interopArg.arguments.at(0);

  if (!t.isStringLiteral(requireArg)) {
    return;
  }

  return requireArg.value;
}

/**
 * Rewrite a host path's separators as POSIX ones.
 *
 * `hostSeparator` is `path.sep`, taken as an argument rather than read from the
 * module. It is the entire decision this function makes, and a test that cannot
 * supply it can only ever observe the branch its own host happens to take — CI
 * runs ubuntu-latest plus one macos-15, so the Windows branch would be exercised
 * nowhere.
 *
 * The gate is not cosmetic. On POSIX a backslash is a legal filename character,
 * so `/project/weird\name.js` is one file and rewriting it would name a
 * different, non-existent path.
 */
export function toPosixPath(path: string, hostSeparator: string): string {
  return hostSeparator === "/" ? path : path.replaceAll("\\", "/");
}

/**
 * Resolve a relative import source against the file that contains it, in POSIX
 * separators.
 *
 * Two properties of the result are load-bearing, and both belong here rather
 * than at the call sites:
 *
 * - **The base is the file's directory.** `filename` is babel's path of the FILE
 *   being transformed (`PluginPass.filename` is `file.opts.filename`), so
 *   `./x` beside it is `dirname(filename)/x`. Resolving against the filename
 *   itself consumes one `..` too few and moves the package boundary by one
 *   directory. Taking the base is part of the operation, which is why this
 *   signature is `(filename, source)` and not a variadic resolve: the caller is
 *   given no base to get wrong.
 * - **The separators are POSIX.** Callers match the result against forward-slash
 *   literals (`react-native/Libraries/Components/`, `react-native-web/dist`) and
 *   re-emit its tail as a module specifier, which is forward-slash by
 *   definition. On Windows `path.resolve` yields backslashes, so those matches
 *   silently miss and the import is left un-rewritten.
 */
export function resolveImportSource(filename: string, source: string): string {
  return toPosixPath(resolve(dirname(filename), source), sep);
}

function declaresName(manifestPath: string): boolean {
  const parsed: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));

  return typeof parsed === "object" && parsed !== null && "name" in parsed;
}

/**
 * The directory of the package `from` belongs to.
 *
 * The babel plugin sits at `<root>/src/babel/` in the tree and at
 * `<root>/dist/<format>/babel/` once built, so no fixed number of `..` names the
 * root in both — a constant written for one layout is silently wrong in the
 * other. The manifest names it, with one wrinkle: react-native-builder-bob
 * writes a bare `{ "type": … }` package.json into each output directory
 * (`react-native-builder-bob/lib/src/utils/compile.js`), so the walk looks for
 * the nearest manifest that declares a `name`.
 */
export function findPackageRoot(from: string): string {
  let directory = from;

  for (;;) {
    const manifest = join(directory, "package.json");

    if (existsSync(manifest) && declaresName(manifest)) {
      return directory;
    }

    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error(`No named package.json above ${from}`);
    }

    directory = parent;
  }
}
