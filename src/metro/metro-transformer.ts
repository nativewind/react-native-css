import { unstable_transformerPath } from "@expo/metro-config";
import type {
  JsTransformerConfig,
  JsTransformOptions,
  TransformResponse,
} from "metro-transform-worker";

import { compile, type CompilerOptions } from "../compiler";
import { getNativeInjectionCode } from "./injection-code";
import { bold, dim, yellow } from "./picocolors";

const worker =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require(unstable_transformerPath) as typeof import("metro-transform-worker");

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

  const cssFile = (await worker.transform(config, projectRoot, filePath, data, {
    ...options,
    platform: "web",
  })) as TransformResponse & {
    output: [{ data: { css: { code: Buffer } } }];
  };

  const css = cssFile.output[0].data.css.code.toString();

  const compiled = compile(css, {
    ...config.reactNativeCSS,
    filename: filePath,
    projectRoot: projectRoot,
  });

  const productionJS = compiled.stylesheet();

  if (options.dev) {
    logWarnings(filePath, compiled.warnings());
  }

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

function logWarnings(
  filePath: string,
  warnings: ReturnType<ReturnType<typeof compile>["warnings"]>,
) {
  const lines: string[] = [];

  if (warnings.properties?.length) {
    lines.push(
      `properties with no React Native equivalent: ${[...new Set(warnings.properties)].join(", ")}`,
    );
  }

  if (warnings.values) {
    for (const [property, values] of Object.entries(warnings.values)) {
      lines.push(
        `unsupported values for ${property}: ${[...new Set(values.map(String))].join(", ")}`,
      );
    }
  }

  if (warnings.functions?.length) {
    lines.push(
      `unsupported functions: ${[...new Set(warnings.functions)].join(", ")}`,
    );
  }

  if (!lines.length) {
    return;
  }

  console.warn(
    `${yellow(bold("react-native-css"))} skipped styles in ${filePath} that cannot be represented on native:\n${lines.map((line) => dim(`  - ${line}`)).join("\n")}`,
  );
}
