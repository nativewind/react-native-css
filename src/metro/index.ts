/* eslint-disable */
import { versions } from "node:process";
import { sep } from "node:path";

import connect from "connect";
import type { MetroConfig } from "metro-config";

import { compile } from "../compiler/compiler";
import { setupTypeScript } from "./typescript";
import { getInjectionCode } from "./injection-code";
import { nativeResolver, webResolver } from "./resolver";

export interface WithReactNativeCSSOptions {
  /* Specify the path to the TypeScript environment file. Defaults types-env.d.ts */
  typescriptEnvPath?: string;
  /* Disable generation of the types-env.d.ts file. Defaults false */
  disableTypeScriptGeneration?: boolean;
  /** Add className to all React Native primitives. Defaults false */
  globalClassNamePolyfill?: boolean;
}

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

  const originalMiddleware = config.server?.enhanceMiddleware;
  const originalResolver = config.resolver?.resolveRequest;

  const poisonPillPath = "./poison.pill";

  return {
    ...config,
    transformerPath: require.resolve("./metro-transformer"),
    resolver: {
      ...config.resolver,
      sourceExts: [...(config?.resolver?.sourceExts || []), "css"],
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName === poisonPillPath) {
          return { type: "empty" };
        }

        // Don't hijack the resolution of react-native imports
        if (!globalClassNamePolyfill) {
          const parentResolver = originalResolver ?? context.resolveRequest;
          return parentResolver(context, moduleName, platform);
        }

        const parentResolver = originalResolver ?? context.resolveRequest;
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
    server: {
      ...config.server,
      enhanceMiddleware(middleware, metroServer) {
        const server = connect();
        const bundler: any = metroServer.getBundler().getBundler();

        if (!bundler.__react_native_css__patched) {
          bundler.__react_native_css__patched = true;

          const cssFiles = new Map();

          const injectionCommonJS = require.resolve("../runtime/native/metro");
          const injectionFilePaths = [
            // CommonJS
            injectionCommonJS,
            // ES Module
            injectionCommonJS.replace(`dist${sep}commonjs`, `dist${sep}module`),
            // TypeScript
            injectionCommonJS
              .replace(`dist${sep}commonjs`, `src`)
              .replace(".js", ".ts"),
          ];

          // Keep the original
          const transformFile = bundler.transformFile.bind(bundler);

          // Patch with our functionality
          bundler.transformFile = async function (
            filePath: string,
            transformOptions: any,
            fileBuffer?: Buffer,
          ) {
            const isCss = /\.(s?css|sass)$/.test(filePath);

            // Handle CSS files on native platforms
            if (isCss && transformOptions.platform !== "web") {
              const real = await transformFile(
                filePath,
                {
                  ...transformOptions,
                  // Force the platform to web for CSS files
                  platform: "web",
                  // Let the transformer know that we will handle compilation
                  customTransformOptions: {
                    ...transformOptions.customTransformOptions,
                    reactNativeCSSCompile: false,
                  },
                },
                fileBuffer,
              );

              const lastTransform = cssFiles.get(filePath);
              const last = lastTransform?.[0];
              const next = real.output[0].data.css.code.toString();

              // The CSS file has changed, we need to recompile the injection file
              if (next !== last) {
                cssFiles.set(filePath, [next, compile(next, {})]);

                bundler.getWatcher().emit("change", {
                  eventsQueue: injectionFilePaths.map((filePath) => ({
                    filePath,
                    metadata: {
                      modifiedTime: Date.now(),
                      size: 1, // Can be anything
                      type: "virtual", // Can be anything
                    },
                    type: "change",
                  })),
                });
              }
            } else if (injectionFilePaths.includes(filePath)) {
              // If this is the injection file, we to swap its content with the
              // compiled CSS files
              fileBuffer = getInjectionCode(
                "./api",
                Array.from(cssFiles.values()).map(([, value]) => value),
              );
            }

            return transformFile(filePath, transformOptions, fileBuffer);
          };
        }

        return originalMiddleware
          ? server.use(originalMiddleware(middleware, metroServer))
          : server.use(middleware);
      },
    },
  };
}
