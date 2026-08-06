import { sep } from "node:path";

import type { Plugin } from "vite";

/**
 * The specifier `vite-plugin-rnw` and most React Native Web setups alias
 * `react-native` to. The alias is applied before user plugins run, so both
 * names have to be matched or the plugin silently never fires.
 */
const REACT_NATIVE_SPECIFIER = /^react-native(-web)?$/;

const COMPONENTS = "react-native-css/components";

const ESBUILD_PLUGIN_NAME = "react-native-css";

/**
 * Equivalent of the Metro resolvers' `isFromThisModule`.
 *
 * `react-native-css/components` re-exports `react-native`, and each wrapper
 * uses its base component at module scope, so redirecting our own imports
 * would create an initialization cycle.
 */
function isFromThisModule(importer: string | undefined): boolean {
  if (!importer) {
    return false;
  }

  const filename = importer.split("?")[0] ?? importer;

  return filename.includes(`${sep}react-native-css${sep}`);
}

/**
 * Vite plugin that enables `className` under Vite-based bundlers, the same way
 * `withReactNativeCSS` does for Metro.
 *
 * ```ts
 * // vite.config.ts
 * import { reactNativeCSS } from "react-native-css/vite";
 *
 * export default defineConfig({
 *   plugins: [reactNativeCSS()],
 * });
 * ```
 *
 * It applies the mapping `nativeResolver` already uses — resolve
 * `react-native` to `react-native-css/components`, which re-exports
 * `react-native` with the className-aware wrappers layered on top.
 *
 * `webResolver`'s approach (rewriting `react-native-web`'s internal module
 * paths) is deliberately not used here. Rollup resolvers do not run during
 * dependency pre-bundling, so it would require excluding `react-native-web`
 * from `optimizeDeps` and then re-adding each of its CommonJS dependencies by
 * hand. It also rewrites `react-native-web`'s own internal imports, which is
 * the circular-import crash in #380.
 */
export function reactNativeCSS(): Plugin {
  return {
    name: "react-native-css",
    enforce: "pre",

    config() {
      return {
        optimizeDeps: {
          /**
           * Pre-bundled dependencies are resolved by esbuild, which does not
           * run Rollup resolvers, so the same mapping is registered there.
           */
          esbuildOptions: {
            plugins: [
              {
                name: ESBUILD_PLUGIN_NAME,
                setup(build) {
                  build.onResolve(
                    { filter: REACT_NATIVE_SPECIFIER },
                    async (args) => {
                      if (isFromThisModule(args.importer)) {
                        return undefined;
                      }

                      const resolved = await build.resolve(COMPONENTS, {
                        kind: args.kind,
                        resolveDir: args.resolveDir,
                      });

                      return resolved.errors.length > 0 ? undefined : resolved;
                    },
                  );
                },
              },
            ],
          },
        },
      };
    },

    async resolveId(source, importer, options) {
      if (!REACT_NATIVE_SPECIFIER.test(source)) {
        return null;
      }

      if (isFromThisModule(importer)) {
        return null;
      }

      return this.resolve(COMPONENTS, importer, { ...options, skipSelf: true });
    },
  };
}

export default reactNativeCSS;
