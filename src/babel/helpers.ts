import { resolve, sep } from "path";

import tBabelTypes, { type CallExpression } from "@babel/types";

export type BabelTypes = typeof tBabelTypes;

export interface PluginOpts {
  target?: string;
  runtime?: string;
  commonjs?: boolean;
}

export interface PluginState {
  opts?: PluginOpts;
  filename: string;
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
 * Rewrite Windows separators as POSIX ones.
 *
 * A pure string transform with no platform check of its own, so a test can feed
 * it a Windows-shaped literal and observe the result on any host. Only call it
 * on a path known to use Windows separators — `resolvePosix` is that caller.
 */
export function toPosixPath(path: string): string {
  return path.replaceAll("\\", "/");
}

/**
 * `path.resolve`, in POSIX separators.
 *
 * The relative-import handlers resolve a source against the file being
 * transformed and then match the result against forward-slash literals
 * (`react-native/Libraries/Components/`, `react-native-web/dist`, …). On Windows
 * `path.resolve` yields backslash separators, so those `split` / `startsWith`
 * matches silently miss and the import is left un-rewritten.
 *
 * The platform check lives here rather than in `toPosixPath` because this is
 * where a host path enters. On POSIX a backslash is a legal filename character,
 * so rewriting one there would corrupt a path that was already correct.
 */
export function resolvePosix(...segments: string[]): string {
  const resolved = resolve(...segments);

  return sep === "/" ? resolved : toPosixPath(resolved);
}
