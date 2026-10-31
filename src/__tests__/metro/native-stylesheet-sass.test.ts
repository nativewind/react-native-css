import { readFileSync } from "node:fs";
import path from "node:path";

import type {
  JsTransformerConfig,
  JsTransformOptions,
} from "metro-transform-worker";

import { transform } from "../../metro/metro-transformer";
import {
  injectedStylesheet,
  recordedTransforms,
  rulesFor,
  TRANSFORM_TIMEOUT_MS,
  type StylesheetTransformResponse,
} from "./_expo-worker";

jest.mock("@expo/metro-config", () => ({
  unstable_transformerPath: require.resolve("./_expo-worker"),
}));

jest.setTimeout(TRANSFORM_TIMEOUT_MS);

const PROJECT_ROOT = path.join(__dirname, "_project-sass");
const STYLESHEET_PATH = path.join(PROJECT_ROOT, "global.scss");

const CONFIG = {} as JsTransformerConfig;

const NATIVE_OPTIONS: JsTransformOptions = {
  dev: true,
  inlinePlatform: false,
  inlineRequires: false,
  minify: false,
  platform: "android",
  type: "module",
  unstable_transformProfile: "default",
};

beforeAll(async () => {
  await transform(
    CONFIG,
    PROJECT_ROOT,
    STYLESHEET_PATH,
    readFileSync(STYLESHEET_PATH),
    NATIVE_OPTIONS,
  );
});

test("a .scss stylesheet is compiled by Dart Sass before the native compiler sees it", () => {
  // `$brand` is a Sass variable, so the colour reaches the stylesheet only once Sass resolved it.
  expect(rulesFor(injectedStylesheet(STYLESHEET_PATH), "sassy")).toContain(
    '"color":"#f00"',
  );
});

test("Sass compiles what the project's PostCSS produced, as Expo's web transform orders them", () => {
  // The project's PostCSS plugin appends `.from-postcss { color: $brand }`, which only Sass resolves.
  expect(
    rulesFor(injectedStylesheet(STYLESHEET_PATH), "from-postcss"),
  ).toContain('"color":"#f00"');
});

test("the stylesheet's own output is emptied and the injection carries the platform", () => {
  expect(
    recordedTransforms.filter(({ filePath }) => filePath === STYLESHEET_PATH),
  ).toStrictEqual([]);
  expect(
    recordedTransforms.find(
      ({ filePath }) => filePath === `${STYLESHEET_PATH}.js`,
    )?.platform,
  ).toBe("android");
});

test("a web build of the stylesheet is the worker's, untouched", async () => {
  const source = readFileSync(STYLESHEET_PATH);
  const webResponse = (await transform(
    CONFIG,
    PROJECT_ROOT,
    STYLESHEET_PATH,
    source,
    {
      ...NATIVE_OPTIONS,
      platform: "web",
    },
  )) as StylesheetTransformResponse;

  const webTransform = recordedTransforms.find(
    ({ filePath, platform }) =>
      filePath === STYLESHEET_PATH && platform === "web",
  );
  expect(webTransform?.source).toBe(source.toString());
  expect(webResponse.output[0].data.css).toBeDefined();
});
