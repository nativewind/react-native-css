import { transformSync } from "@babel/core";

import plugin from "../babel/import-plugin";

/**
 * Drives the real babel plugin through `@babel/core`, so `state.filename` is
 * populated by babel itself rather than by a test double. `configFile` /
 * `babelrc` are off so the result is this plugin's output and nothing else.
 *
 * Underscore-prefixed, so jest's `testPathIgnorePatterns` treats it as a fixture
 * rather than a suite.
 */
export function transformWithBabelPlugin(
  code: string,
  filename?: string,
  options: { cwd?: string } = {},
): string {
  const result = transformSync(code, {
    filename,
    cwd: options.cwd,
    configFile: false,
    babelrc: false,
    plugins: [plugin],
  });

  const output = result?.code;
  if (typeof output !== "string") {
    throw new Error(`babel produced no output for ${filename ?? "<unnamed>"}`);
  }

  return output;
}
