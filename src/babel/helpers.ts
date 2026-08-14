import { resolve } from "path";

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
 * A path in POSIX separators, whatever the host uses.
 *
 * The relative-import handlers resolve a source against the file being
 * transformed and then match the result against forward-slash literals
 * (`react-native/Libraries/Components/`, `react-native-web/dist`, …). On Windows
 * `path.resolve` yields backslash separators, so those `split` / `startsWith`
 * matches silently miss and the import is left un-rewritten.
 *
 * Unconditional rather than gated on `sep`, so it is the same function on every
 * host and a test can feed it a Windows-shaped literal. Gating it would make the
 * normalization unobservable on Linux, which is the only platform CI runs.
 */
export function toPosixPath(path: string): string {
  return path.replaceAll("\\", "/");
}

/** `path.resolve`, normalized to POSIX separators. */
export function resolvePosix(...segments: string[]): string {
  return toPosixPath(resolve(...segments));
}
