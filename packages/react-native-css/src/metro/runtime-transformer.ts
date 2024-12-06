import worker, {
  JsTransformerConfig,
  JsTransformOptions,
  TransformResponse,
} from "metro-transform-worker";

export async function transform(
  config: JsTransformerConfig,
  projectRoot: string,
  filename: string,
  data: Buffer,
  options: JsTransformOptions,
): Promise<TransformResponse> {
  /**
   * The style object can be quite large and running it though a transform can be quite costly
   * Since the style file only uses a single import, we can transform a fake file to get the
   * dependencies and function mapping
   */
  const fakeFile = `import { StyleSheet } from "react-native-css/runtime";StyleSheet.register({});`;
  const result = await transform(
    config,
    projectRoot,
    filename,
    Buffer.from(fakeFile),
    options,
  );

  const output = result.output[0] as any;
  const code = output.data.code.replace("({})", data.toString("utf-8"));

  return {
    ...result,
    output: [
      {
        ...output,
        data: {
          ...output.data,
          code,
        },
      },
    ],
  };
}
