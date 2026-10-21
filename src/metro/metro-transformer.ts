import { unstable_transformerPath } from "@expo/metro-config";
import type {
  JsTransformerConfig,
  JsTransformOptions,
} from "metro-transform-worker";

import { compile, type CompilerOptions } from "../compiler";
import { getNativeInjectionCode } from "./injection-code";
import { reportCompilerWarnings, type WarningLevel } from "./warnings";

type TransformResponse = Awaited<
  ReturnType<typeof import("metro-transform-worker").transform>
>;

const worker =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require(unstable_transformerPath) as typeof import("metro-transform-worker");

export async function transform(
  config: JsTransformerConfig & {
    reactNativeCSS?:
      | (CompilerOptions & { warnings?: WarningLevel | undefined })
      | undefined;
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

  const cssFile = (await worker.transform(config, projectRoot, filePath, data, {
    ...options,
    platform: "web",
  })) as TransformResponse & {
    output: [{ data: { css: { code: Buffer } } }];
  };

  const css = cssFile.output[0].data.css.code.toString();

  const { warnings: warningLevel, ...compilerOptions } =
    config.reactNativeCSS ?? {};

  const compiled = compile(css, {
    ...compilerOptions,
    filename: filePath,
    projectRoot: projectRoot,
  });

  const productionJS = compiled.stylesheet();

  // Nothing downstream of the transformer sees the compile result, so this is the one place a build can report it
  reportCompilerWarnings(compiled.warnings(), {
    filename: filePath,
    projectRoot,
    level: warningLevel,
  });

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
