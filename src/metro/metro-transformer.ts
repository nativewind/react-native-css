import { unstable_transformerPath } from "@expo/metro-config";
import { transformPostCssModule } from "@expo/metro-config/build/transform-worker/postcss";
import * as sassPreprocessor from "@expo/metro-config/build/transform-worker/sass";
import type {
  JsTransformerConfig,
  JsTransformOptions,
} from "metro-transform-worker";

import { compile, type CompilerOptions } from "../compiler";
import { getNativeInjectionCode } from "./injection-code";

type TransformResponse = Awaited<
  ReturnType<typeof import("metro-transform-worker").transform>
>;

const worker =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require(unstable_transformerPath) as typeof import("metro-transform-worker");

/** Expo types its Sass helpers through the optional `sass` package, so the shape used here is stated here. */
interface SassPreprocessor {
  readonly matchSass: (filename: string) => string | null;
  readonly compileSass: (
    projectRoot: string,
    input: { filename: string; src: string },
    options: { syntax: string },
  ) => { src: string };
}

const { compileSass, matchSass }: SassPreprocessor = sassPreprocessor;

/**
 * The stylesheet as the project authored it, after its PostCSS and Sass steps.
 *
 * This is the input the native compiler needs, and it is NOT the web build of the same file.
 * Expo's web transform also runs lightningcss against the project's browserslist, and a device
 * is not one of those browsers: that pass lowers `:dir()` into `:lang()` lists the compiler has
 * no reading for, so every `rtl:` / `ltr:` rule is dropped; it rewrites `oklch()` colors as
 * `lab()` beside a hex fallback in a second `:root`, which doubles every root variable and stops
 * the compiler inlining any of them; and all of it moves whenever the browserslist does.
 */
async function preprocessStylesheet(
  projectRoot: string,
  filePath: string,
  source: string,
): Promise<string> {
  const { src } = await transformPostCssModule(projectRoot, {
    src: source,
    filename: filePath,
  });

  const syntax = matchSass(filePath);
  if (!syntax) {
    return src;
  }

  return compileSass(projectRoot, { filename: filePath, src }, { syntax }).src;
}

export async function transform(
  config: JsTransformerConfig & {
    reactNativeCSS?: CompilerOptions | undefined;
  },
  projectRoot: string,
  filePath: string,
  data: Buffer,
  options: JsTransformOptions,
): Promise<TransformResponse> {
  const isCss = options.type !== "asset" && /\.(s?css|sass)$/.test(filePath);

  if (options.platform === "web" || !isCss) {
    return worker.transform(config, projectRoot, filePath, data, options);
  }

  const css = await preprocessStylesheet(
    projectRoot,
    filePath,
    data.toString("utf8"),
  );

  const productionJS = compile(css, {
    ...config.reactNativeCSS,
    filename: filePath,
    projectRoot: projectRoot,
  }).stylesheet();

  data = Buffer.from(getNativeInjectionCode([], [productionJS]));

  const transform = await worker.transform(
    config,
    projectRoot,
    `${filePath}.js`,
    data,
    options,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (transform as any).output[0].data.css = {
    skipCache: true,
    code: "",
  };

  return transform;
}
