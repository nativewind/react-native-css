/**
 * A stand-in for Expo's transform worker, so the Metro transformer can be driven without Metro.
 *
 * Its web branch does what `@expo/metro-config`'s `transformCss` does to a global stylesheet: the
 * project's PostCSS, Sass for a `.scss` or `.sass` file, then lightningcss against the project's
 * browser targets. The target here is
 * one browser without `:dir()` support, so the lowering that pass performs for real (a `:dir()`
 * becomes a `:lang()` list) happens here for real too. Every other file is echoed back as a bare
 * JS module, and the stylesheet the transformer injects in a stylesheet's place is read back from
 * the module it hands over.
 */
import { transformPostCssModule } from "@expo/metro-config/build/transform-worker/postcss";
import {
  compileSass,
  matchSass,
} from "@expo/metro-config/build/transform-worker/sass";
import { Features, transform as transformStylesheet } from "lightningcss";
import type {
  JsTransformerConfig,
  JsTransformOptions,
  transform as workerTransform,
} from "metro-transform-worker";
import type { ReactNativeCssStyleSheet } from "react-native-css/compiler";

type TransformResponse = Awaited<ReturnType<typeof workerTransform>>;

/** The response with the CSS metadata the transformer attaches — the shape it declares itself. */
export type StylesheetTransformResponse = TransformResponse & {
  readonly output: readonly [{ readonly data: { readonly css: unknown } }];
};

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

export function injectedStylesheet(
  stylesheetPath: string,
): ReactNativeCssStyleSheet {
  const injection = recordedTransforms.find(
    ({ filePath }) => filePath === `${stylesheetPath}.js`,
  );
  if (!injection) {
    throw new Error(
      "the transformer never handed the worker an injection module",
    );
  }
  const match = /StyleCollection\.inject\((.*)\);/s.exec(injection.source);
  if (!match?.[1]) {
    throw new Error("the injection module carries no stylesheet");
  }
  return JSON.parse(match[1]) as ReactNativeCssStyleSheet;
}

export function rulesFor(
  stylesheet: ReactNativeCssStyleSheet,
  className: string,
): string | undefined {
  const entry = stylesheet.s?.find(([name]) => name === className);
  return entry ? JSON.stringify(entry[1]) : undefined;
}

/** Loading and running the stylesheet pipeline outlasts jest's 5 s default on a loaded machine. */
export const TRANSFORM_TIMEOUT_MS = 60_000;

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

  if (options.platform === "web" && /\.(s?css|sass)$/.test(filePath)) {
    const { src } = await transformPostCssModule(projectRoot, {
      src: data.toString(),
      filename: filePath,
    });
    const syntax = matchSass(filePath);
    const css = syntax
      ? compileSass(projectRoot, { filename: filePath, src }, { syntax }).src
      : src;
    const { code } = transformStylesheet({
      filename: filePath,
      code: Buffer.from(css),
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
