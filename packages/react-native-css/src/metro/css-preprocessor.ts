import fs from "node:fs";
import fsPromise from "node:fs/promises";
import path from "node:path";

import connect from "connect";
import type { InputConfigT, ServerConfigT } from "metro-config";
import type { FileSystem } from "metro-file-map";
import { CustomResolutionContext, Resolution } from "metro-resolver";
import type MetroServer from "metro/src/Server";

import { compile } from "../compiler";
import { WithCssOptions } from "./metro";

let haste: any;
let virtualModulesPossible: undefined | Promise<void> = undefined;
const outputDirectory = path.resolve(__dirname, "../../.cache");
const virtualModules = new Map<string, Promise<string | Buffer>>();

type WithCssOptionsWithDefaults = WithCssOptions &
  Required<Pick<WithCssOptions, "logger" | "cssFileFilter">>;

export function setup() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(platformPath("ios"), "");
  fs.writeFileSync(platformPath("android"), "");
  fs.writeFileSync(platformPath("native"), "");
  fs.writeFileSync(platformPath("macos"), "");
  fs.writeFileSync(platformPath("windows"), "");
}

export const getCssPreprocessorMiddleware: (
  config: InputConfigT,
  isRadonIDE: boolean,
  { logger, allowVirtualModules }: WithCssOptionsWithDefaults,
) => ServerConfigT["enhanceMiddleware"] =
  (config, isRadonIDE, { logger, allowVirtualModules }) =>
  (middleware, metroServer) => {
    const originalMiddleware = config.server?.enhanceMiddleware;

    logger(`enhanceMiddleware.setup`);
    const server = connect();
    const bundler = metroServer.getBundler().getBundler();

    if (allowVirtualModules === false) {
      logger(`forceWriteFileSystem true`);
    } else {
      if (!isRadonIDE) {
        virtualModulesPossible = bundler
          .getDependencyGraph()
          .then(async (graph: any) => {
            haste = graph._haste;
            ensureFileSystemPatched(graph._fileSystem);
            ensureBundlerPatched(bundler);
          });

        server.use(async (_, __, next) => {
          // Wait until the bundler patching has completed
          await virtualModulesPossible;
          next();
        });
      }
    }

    return originalMiddleware
      ? server.use(originalMiddleware(middleware, metroServer))
      : server.use(middleware);
  };

export async function transformOptions(
  platform: string,
  dev: boolean,
  isRadonIDE: boolean,
  outputDirectory: string,
  options: WithCssOptionsWithDefaults,
) {
  if (!options.cssPreprocessor) return;

  const filePath = platformPath(platform);

  const logger = options.logger;

  if (virtualModulesPossible) {
    await virtualModulesPossible;
    await startCSSProcessor(filePath, platform, dev, options);
  }

  // We need to write to the file system if virtual modules are not possible and/or we are building for production
  const writeToFileSystem = !virtualModulesPossible || !dev;

  logger(`getTransformOptions.writeToFileSystem ${writeToFileSystem}`);

  if (writeToFileSystem) {
    logger(`getTransformOptions.output ${filePath}`);

    // Radon IDE needs to watch the file system for changes, so we need to write the file
    const watchFn = isRadonIDE
      ? async (css: string) => {
          const output =
            platform === "web"
              ? css.toString()
              : getNativeJS(compile(css, options), options);

          await fsPromise.writeFile(filePath, output);
        }
      : undefined;

    const css = await options.cssPreprocessor(platform, watchFn);

    const output =
      platform === "web"
        ? css.toString("utf-8")
        : getNativeJS(compile(css, options), options);

    await fsPromise.mkdir(outputDirectory, { recursive: true });
    await fsPromise.writeFile(filePath, output);
    if (platform !== "web") {
      await fsPromise.writeFile(filePath.replace(/\.js$/, ".map"), "");
    }

    logger(`getTransformOptions.finished`);
  }
}

export function resolveRequest(
  context: CustomResolutionContext,
  resolved: Extract<Resolution, { filePath: string }>,
  platform: string,
  options: WithCssOptionsWithDefaults,
) {
  const logger = options.logger;
  const cssFileFilter = new RegExp(options.cssFileFilter);

  // Make sure we only process CSS files
  if (!cssFileFilter.test(resolved.filePath)) {
    return resolved;
  }

  // Generate a fake name for our virtual module. Make it platform specific
  const filePath = platformPath(platform);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const development = (context as any).isDev || (context as any).dev;
  const isWebProduction = !development && platform === "web";

  logger(`resolveRequest.input ${resolved.filePath}`);
  logger(`resolveRequest.resolvedTo: ${filePath}`);
  logger(`resolveRequest.development: ${development}`);
  logger(`resolveRequest.platform: ${platform}`);

  if (virtualModulesPossible && !isWebProduction) {
    startCSSProcessor(filePath, platform, development, options);
  }

  return {
    ...resolved,
    filePath,
  };
}

async function startCSSProcessor(
  filePath: string,
  platform: string,
  isDev: boolean,
  options: WithCssOptionsWithDefaults,
) {
  // Ensure that we only start the processor once per file
  if (virtualModules.has(filePath) || !options.cssPreprocessor) {
    return;
  }

  const logger = options.logger;

  logger(`virtualModules ${filePath}`);
  logger(`virtualModules.isDev ${isDev}`);
  logger(`virtualModules.size ${virtualModules.size}`);

  if (!isDev) {
    logger(`virtualModules.fastRefresh disabled`);
    virtualModules.set(
      filePath,
      options.cssPreprocessor(platform).then((css) => {
        return platform === "web"
          ? css
          : getNativeJS(compile(css, options), options);
      }),
    );
  } else {
    logger(`virtualModules.fastRefresh enabled`);
    virtualModules.set(
      filePath,
      options
        .cssPreprocessor(platform, (css: string) => {
          logger(`virtualStyles.update ${platform}`);
          // Override the virtual module with the new update
          virtualModules.set(
            filePath,
            Promise.resolve(
              platform === "web"
                ? css
                : getNativeJS(compile(css, options), options),
            ),
          );

          logger(`virtualStyles.emit ${platform}`);
          haste.emit("change", {
            eventsQueue: [
              {
                filePath,
                metadata: {
                  modifiedTime: Date.now(),
                  size: 1, // Can be anything
                  type: "virtual", // Can be anything
                },
                type: "change",
              },
            ],
          });
        })
        .then((css) => {
          logger(`virtualStyles.initial ${platform}`);
          return platform === "web"
            ? css
            : getNativeJS(compile(css, options), options);
        }),
    );
  }
}

/**
 * Patch the Metro File system to new cache virtual modules
 */
function ensureFileSystemPatched(
  fs: FileSystem & {
    getSha1: {
      __css_interop_patched?: boolean;
    };
  },
) {
  if (!fs.getSha1.__css_interop_patched) {
    const original_getSha1 = fs.getSha1.bind(fs);
    fs.getSha1 = (filename) => {
      if (virtualModules.has(filename)) {
        // Don't cache this file. It should always be fresh.
        return `${filename}-${Date.now()}`;
      }
      return original_getSha1(filename);
    };
    fs.getSha1.__css_interop_patched = true;
  }

  return fs;
}

/**
 * Patch the bundler to use virtual modules
 */
function ensureBundlerPatched(
  bundler: ReturnType<ReturnType<MetroServer["getBundler"]>["getBundler"]> & {
    transformFile: { __css_interop__patched?: boolean };
  },
) {
  if (bundler.transformFile.__css_interop__patched) {
    return;
  }

  const transformFile = bundler.transformFile.bind(bundler);

  bundler.transformFile = async function (
    filePath,
    transformOptions,
    fileBuffer,
  ) {
    const virtualModule = virtualModules.get(filePath);

    if (virtualModule) {
      fileBuffer = Buffer.from(await virtualModule);
    }
    return transformFile(filePath, transformOptions, fileBuffer);
  };
  bundler.transformFile.__css_interop__patched = true;
}

function getNativeJS(
  data = {},
  { logger }: WithCssOptionsWithDefaults,
): string {
  logger("Start stringify");
  const output = `(${stringify(data)})`;
  logger(`Output size: ${Buffer.byteLength(output, "utf8")} bytes`);
  return output;
}

/**
 * Convert a data structure to JavaScript.
 * The output should be similar to JSON, but without the extra characters.
 */
function stringify(data: unknown): string {
  switch (typeof data) {
    case "bigint":
    case "symbol":
    case "function":
      throw new Error(`Cannot stringify ${typeof data}`);
    case "string":
      return `"${data}"`;
    case "number":
      // Reduce to 3 decimal places
      return `${Math.round(data * 1000) / 1000}`;
    case "boolean":
      return `${data}`;
    case "undefined":
      // null is processed faster than undefined
      // JSON.stringify also converts undefined to null
      return "null";
    case "object": {
      if (data === null) {
        return "null";
      } else if (Array.isArray(data)) {
        return `[${data
          .map((value) => {
            // These values can be omitted to create a holey array
            // This is slightly slower to parse at runtime, but keeps the
            // file size smaller
            return value === null || value === undefined
              ? ""
              : stringify(value);
          })
          .join(",")}]`;
      } else {
        return `{${Object.entries(data)
          .flatMap(([key, value]) => {
            // If an object's property is undefined or null we can just skip it
            if (value === null || value === undefined) {
              return [];
            }

            // Make sure we quote strings that require quotes
            if (key.match(/[^a-zA-Z]/)) {
              key = `"${key}"`;
            }

            value = stringify(value);

            return [`${key}:${value}`];
          })
          .join(",")}}`;
      }
    }
  }
}

function platformPath(platform = "native") {
  return path.join(
    outputDirectory,
    `${platform}.${platform === "web" ? "css" : "js"}`,
  );
}
