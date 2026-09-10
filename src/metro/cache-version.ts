import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import type { CompilerOptions } from "../compiler";

/**
 * Expo's supervising worker bypasses a custom worker's getCacheKey hook.
 * Put the engine fingerprint in Metro's top level cacheVersion instead so
 * both supervised and direct workers invalidate compiled CSS after an update.
 */
export function getCacheVersion(
  cacheVersion: string | undefined,
  options: CompilerOptions | undefined,
) {
  const root = dirname(__dirname);
  const hash = createHash("sha256");

  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
      (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
    )) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!["__tests__", "__fixtures__", "__mocks__"].includes(entry.name)) {
          visit(file);
        }
      } else if (
        entry.isFile() &&
        /\.[cm]?[jt]sx?$/.test(entry.name) &&
        !/\.d\.[cm]?ts$/.test(entry.name)
      ) {
        // Relative names keep identical installations independent of location.
        hash.update(relative(root, file).split("\\").join("/"));
        hash.update("\0");
        hash.update(readFileSync(file));
        hash.update("\0");
      }
    }
  }

  // Cover transitive engine helpers as well as the transformer itself. Maps,
  // declarations, and tests do not affect the generated application code.
  visit(root);
  hash.update(JSON.stringify(options ?? {}));
  return `${cacheVersion ?? ""}:react-native-css:${hash.digest("hex")}`;
}
