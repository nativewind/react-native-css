import { unstable_transformerPath } from "@expo/metro-config";
import type {
  JsTransformerConfig,
  JsTransformOptions,
  TransformResponse,
} from "metro-transform-worker";

import { compile, type CompilerOptions } from "../compiler";
import { getNativeInjectionCode } from "./injection-code";
import { reportCompilerWarnings, type WarningLevel } from "./warnings";

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

  // The compiler records every declaration it could not translate. This is the
  // only place a real build can read them — nothing downstream of the
  // transformer ever sees the compile result again.
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
