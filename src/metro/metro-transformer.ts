import { unstable_transformerPath } from "@expo/metro-config";
import { transformPostCssModule } from "@expo/metro-config/build/transform-worker/postcss";
import {
  compileSass,
  matchSass,
} from "@expo/metro-config/build/transform-worker/sass";
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

/** The stylesheet after the project's PostCSS and Sass, never Expo's web build of it, which lightningcss lowers for the project's browsers. */
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
