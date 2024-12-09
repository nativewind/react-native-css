import { error } from "console";

import debug from "debug";
import type { MetroConfig } from "metro-config";

import { type CompilerOptions } from "../compiler";
import {
  cssFileFilter,
  CssPreprocessor,
  resolveRequest as cssPreprocessorResolveRequest,
  transformOptions as cssPreprocessorTransformOptions,
  getCssPreprocessorMiddleware,
  setup as preprocessorSetup,
} from "./css-preprocessor";
import { errorMessages, ErrorMessages } from "./errors";
import { expoColorSchemeWarning } from "./expo";
import { checkJSXSetup } from "./jsx-babel-check";
import { ReactNativeCssTransformerConfig } from "./transformer";
import { setupTypeScript } from "./typescript";

export type WithCssOptions = CompilerOptions & {
  /**
   * RegExp or string to filter what is considered a CSS file.
   */
  cssFileFilter?: string;
  /**
   * A replacement transformer for the CSS files.
   */
  cssTransformerPath?: string;
  /**
   * A function to resolve the CSS for a platform. Providing this callback will
   * enable the virtual module setup.
   */
  cssPreprocessor?: CssPreprocessor;
  /**
   * A replacement transformer for the runtime. Called after `cssTransformerPath`.
   */
  runtimeTransformerPath?: string;
  /**
   * When cssProcessor is provided, virtual modules are enabled by default in development.
   * Disabling this option will write the CSS to disk, mimicking production builds.
   */
  allowVirtualModules?: boolean;
  /**
   * Set to false to disable the JSX transform setup check
   */
  jsxTransform?: boolean;
  /**
   * Set to false to disable the automatic TypeScript setup
   */
  typescriptSetup?: boolean;
  /**
   * Change the `react-native-css-env.d.ts` file path
   */
  typescriptEnvPath?: string;
  /**
   * Used by frameworks to customize error messages to make them framework specific
   */
  errorMessages: Partial<ErrorMessages>;
};

let virtualModulesPossible: undefined | Promise<void> = undefined;
const isRadonIDE = "REACT_NATIVE_IDE_LIB_PATH" in process.env;

/**
 * Injects the CSS into the React Native runtime.
 *
 * Web:
 *  @expo/metro-config provides all the code needed to handle .css files
 *  This is why we can only support Expo for web projects for the time being
 *  The user will import their .css file, we need to catch this in the resolution
 *  and replace it either with the virtual module (development) or the Tailwind output (production)
 *
 * Native:
 *  When the user imports their .css file, we need to swap it out for a JavaScript file
 *  that injects the global styles. In development we swap to a virtual module and in production we
 *  swap to a .js file generated in the node_modules
 *
 * ------------------
 * Notes
 * ------------------
 *
 * - The virtual module setup requires the development server, so when its turned off we need to write styles to disk
 * - Metro has two run modes, normal (with a server) and headless. In headless mode the `enhancedMiddleware` is not called.
 *   THIS DOES NOT MEAN THAT FAST-REFRESH IS NOT ENABLED! It just means you are making a build that CAN connect to an instance
 *   of Metro that is running a server. E.g `eas` may do a development build that you download and connect to your local server
 * - You can also do production builds WITH Fast Refresh `npx expo run:android --variant production` will start a production
 *   like build, but still enable the dev server for fast refresh.
 * - RadonIDE doesn't use the virtual module setup, it writes the style changes to disk
 * - expo-updates starts its own Metro server with weird timing issues that we cannot resolve. This is why we always write to disk in production.
 *
 * ------------------
 * Different build types
 * ------------------
 * Each of these commands will trigger a different build type.
 *
 *  - `expo start`
 *  - `expo run <platform> --variant production|development`
 *  - `expo export`
 *  - `eas build (without expo-updates)`
 *  - `eas build (with expo-updates)`
 *  - `react-native run`
 *  - `react-native build`
 *  - `npx expo prebuild & building in xcode (development)`
 *  - `npx expo prebuild & building in xcode (production)`
 */
export function getMetroConfig(
  config: MetroConfig,
  interopOptions?: WithCssOptions,
): MetroConfig {
  const options = {
    logger: debug("react-native-css"),
    cssFileFilter: "\.css$",
    typescriptEnvPath: "react-native-css-env.d.ts",
    ...interopOptions,
    errorMessages: Object.assign(
      {},
      errorMessages,
      interopOptions?.errorMessages,
    ),
  };

  const logger = options.logger;

  logger("withCss");
  logger(`isRadonIDE: ${isRadonIDE}`);

  expoColorSchemeWarning();

  if (options.typescriptSetup !== false) {
    setupTypeScript(options.typescriptEnvPath);
  }

  if (options.jsxTransform !== false) {
    checkJSXSetup("react-native-css/babel", options.errorMessages);
  }

  const originalResolver = config.resolver?.resolveRequest;
  const originalGetTransformOptions = config.transformer?.getTransformOptions;

  // Used by the resolverPoisonPill
  const poisonPillPath = "./interop-poison.pill";

  if (options.cssPreprocessor) {
    preprocessorSetup(options);
  }

  const customTransformOptions: ReactNativeCssTransformerConfig = {
    reactNativeCss: {
      originalTransformerPath: config.transformerPath,
      cssTransformerPath:
        options.cssTransformerPath || require.resolve("./runtime-transformer"),
      cssFileFilter: options.cssPreprocessor
        ? cssFileFilter
        : options.cssFileFilter,
    },
  };

  return {
    ...config,
    transformerPath: require.resolve("./transformer"),
    transformer: {
      ...config.transformer,
      ...customTransformOptions,
      async getTransformOptions(
        entryPoints,
        transformOptions,
        getDependenciesOf,
      ) {
        logger(`getTransformOptions.dev ${transformOptions.dev}`);
        logger(`getTransformOptions.platform ${transformOptions.platform}`);
        logger(
          `getTransformOptions.virtualModulesPossible ${Boolean(virtualModulesPossible)}`,
        );

        if (options.cssPreprocessor) {
          const platform = transformOptions.platform || "native";
          await cssPreprocessorTransformOptions(
            platform,
            transformOptions.dev,
            isRadonIDE,
            options,
          );
        }

        return Object.assign(
          { reactNativeCSS: { test: true } },
          await originalGetTransformOptions?.(
            entryPoints,
            transformOptions,
            getDependenciesOf,
          ),
        );
      },
    },
    server: {
      ...config.server,
      enhanceMiddleware: getCssPreprocessorMiddleware(
        config,
        isRadonIDE,
        options,
      ),
    },
    resolver: {
      ...config.resolver,
      sourceExts: [...(config?.resolver?.sourceExts || []), "css"],
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName === poisonPillPath) {
          return { type: "empty" };
        }

        const resolver = originalResolver ?? context.resolveRequest;
        const resolved = resolver(context, moduleName, platform);

        if (!("filePath" in resolved)) {
          return resolved;
        }

        // Only preprocesses use custom resolvers
        if (!options.cssPreprocessor) {
          return resolved;
        }

        return cssPreprocessorResolveRequest(
          context,
          resolved,
          platform ?? "native",
          options,
        );
      },
    },
  };
}
