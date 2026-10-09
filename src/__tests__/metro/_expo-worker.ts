/**
 * A stand-in for Expo's transform worker, so the Metro transformer can be driven without Metro.
 *
 * Its web branch does what `@expo/metro-config`'s `transformCss` does to a global stylesheet: the
 * project's PostCSS, then lightningcss against the project's browser targets. The target here is
 * one browser without `:dir()` support, so the lowering that pass performs for real (a `:dir()`
 * becomes a `:lang()` list) happens here for real too. Every other file is echoed back as a bare
 * JS module.
 */
import { transformPostCssModule } from "@expo/metro-config/build/transform-worker/postcss";
import { Features, transform as transformStylesheet } from "lightningcss";
import type {
  JsTransformerConfig,
  JsTransformOptions,
  transform as workerTransform,
} from "metro-transform-worker";

type TransformResponse = Awaited<ReturnType<typeof workerTransform>>;

/** Expo attaches the stylesheet's CSS to the web build's module output. */
type BrowserBuildOutput = TransformResponse["output"][number] & {
  readonly data: { readonly css: { readonly code: Buffer } };
};

export interface RecordedTransform {
  readonly filePath: string;
  readonly platform: JsTransformOptions["platform"];
  readonly source: string;
}

export const recordedTransforms: RecordedTransform[] = [];

/** Chrome 100 predates `:dir()` (Chrome 120), in lightningcss's `major << 16` encoding. */
const CHROME_100 = 100 << 16;

const jsModule = (code: string): TransformResponse => ({
  dependencies: [],
  output: [
    {
      type: "js/module",
      data: {
        code,
        lineCount: code.split("\n").length,
        map: [],
        functionMap: null,
      },
    },
  ],
});

export async function transform(
  _config: JsTransformerConfig,
  projectRoot: string,
  filePath: string,
  data: Buffer,
  options: JsTransformOptions,
): Promise<TransformResponse> {
  recordedTransforms.push({
    filePath,
    platform: options.platform,
    source: data.toString(),
  });

  if (options.platform === "web" && filePath.endsWith(".css")) {
    const { src } = await transformPostCssModule(projectRoot, {
      src: data.toString(),
      filename: filePath,
    });
    const { code } = transformStylesheet({
      filename: filePath,
      code: Buffer.from(src),
      targets: { chrome: CHROME_100 },
      include: Features.Nesting,
      errorRecovery: true,
    });
    const browserBuild: BrowserBuildOutput = {
      type: "js/module",
      data: {
        code: "",
        lineCount: 0,
        map: [],
        functionMap: null,
        css: { code: Buffer.from(code) },
      },
    };
    return { dependencies: [], output: [browserBuild] };
  }

  return jsModule(data.toString());
}
