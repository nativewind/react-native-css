import { dirname, resolve, sep } from "path";

import tBabelTypes, { type CallExpression } from "@babel/types";

export type BabelTypes = typeof tBabelTypes;

export interface PluginOpts {
  target?: string;
  runtime?: string;
  commonjs?: boolean;
}

export interface PluginState {
  opts?: PluginOpts;
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

// The handlers match "/"-separated package paths, and path.resolve separates with "\" on Windows
export function resolveImportSource(filename: string, source: string): string {
  return resolve(dirname(filename), source).split(sep).join("/");
}
