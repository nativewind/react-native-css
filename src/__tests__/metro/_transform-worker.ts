import type { JsTransformOptions } from "metro-transform-worker";

// Stands in for Expo's transform worker: on web a stylesheet comes back as CSS, and anything else as code
export function transform(
  _config: unknown,
  _projectRoot: string,
  filename: string,
  data: Buffer,
  options: JsTransformOptions,
) {
  return Promise.resolve(
    options.platform === "web" && filename.endsWith(".css")
      ? { output: [{ data: { css: { code: data } } }] }
      : { output: [{ data: { code: data.toString() } }] },
  );
}
