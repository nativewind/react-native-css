import worker, {
  JsTransformerConfig,
  JsTransformOptions,
  TransformResponse,
} from "metro-transform-worker";

export type ReactNativeCssTransformerConfig = {
  reactNativeCss: {
    cssFileFilter: string;
    cssTransformerPath: string;
    originalTransformerPath?: string;
  };
};

export async function transform(
  config: ReactNativeCssTransformerConfig & JsTransformerConfig,
  projectRoot: string,
  filename: string,
  data: Buffer,
  options: JsTransformOptions,
): Promise<TransformResponse> {
  const transform = config.reactNativeCss?.originalTransformerPath
    ? require(config.reactNativeCss?.originalTransformerPath).transform
    : worker.transform;

  const cssFileFilter = new RegExp(config.reactNativeCss.cssFileFilter);

  if (options.platform !== "web" && cssFileFilter.test(filename)) {
    return require(config.reactNativeCss.cssTransformerPath).transform(
      config,
      projectRoot,
      filename,
      data,
      options,
    );
  }

  return transform(config, projectRoot, filename, data, options);
}
