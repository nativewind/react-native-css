/* eslint-disable */
import { versions } from "node:process";

import type { MetroConfig } from "metro-config";

import { type CompilerOptions } from "../compiler";
import { nativeResolver, webResolver } from "./resolver";
import { setupTypeScript } from "./typescript";

export interface WithReactNativeCSSOptions extends CompilerOptions {
  /* Specify the path to the TypeScript environment file. Defaults types-env.d.ts */
  typescriptEnvPath?: string;
  /* Disable generation of the types-env.d.ts file. Defaults false */
  disableTypeScriptGeneration?: boolean;
  /** Add className to all React Native primitives. Defaults false */
  globalClassNamePolyfill?: boolean;
  hexColors?: boolean;
}

const metroOverrideResolution = {
  type: "sourceFile",
  filePath: require.resolve("./override"),
};

export function withReactNativeCSS<
  T extends MetroConfig | (() => Promise<MetroConfig>),
>(config: T, options?: WithReactNativeCSSOptions): T {
  if (typeof config === "function") {
    return (async () => {
      return withReactNativeCSS(await config(), options);
    }) as T;
  }

  if (Number(versions.node.split(".")[0]) < 20) {
    throw new Error("react-native-css only supports NodeJS >20");
  }

  const {
    disableTypeScriptGeneration,
    typescriptEnvPath,
    globalClassNamePolyfill = false,
  } = options || {};

  if (disableTypeScriptGeneration !== true) {
    setupTypeScript(typescriptEnvPath);
  }

  return {
    ...config,
    transformerPath: require.resolve("./metro-transformer"),
    transformer: {
      ...config.transformer,
      reactNativeCSS: options,
    },
    resolver: {
      ...config.resolver,
      sourceExts: [...(config?.resolver?.sourceExts || []), "css"],
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName.includes("react-native-css-metro-override")) {
          return metroOverrideResolution;
        }

        const parentResolver =
          config.resolver?.resolveRequest ?? context.resolveRequest;

        // Don't hijack the resolution of react-native imports
        if (!globalClassNamePolyfill) {
          return parentResolver(context, moduleName, platform);
        }

        const resolver = platform === "web" ? webResolver : nativeResolver;
        const resolved = resolver(
          parentResolver,
          context,
          moduleName,
          platform,
        );

        return resolved;
      },
    },
  };
}
