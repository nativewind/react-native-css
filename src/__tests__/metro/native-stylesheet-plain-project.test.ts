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
} from "./_expo-worker";

jest.mock("@expo/metro-config", () => ({
  unstable_transformerPath: require.resolve("./_expo-worker"),
}));

jest.setTimeout(TRANSFORM_TIMEOUT_MS);

// Its own file: Expo resolves a project's PostCSS pipeline once per process, so a project WITHOUT a
// config has to be the first one this process sees.
const PROJECT_ROOT = path.join(__dirname, "_project-plain");
const STYLESHEET_PATH = path.join(PROJECT_ROOT, "global.css");
const INDENTED_STYLESHEET_PATH = path.join(PROJECT_ROOT, "indented.sass");

const CONFIG = {} as JsTransformerConfig;

const NATIVE_OPTIONS: JsTransformOptions = {
  dev: true,
  inlinePlatform: false,
  inlineRequires: false,
  minify: false,
  platform: "ios",
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

test("a project with no PostCSS config compiles the stylesheet as authored", () => {
  const rules = injectedStylesheet(STYLESHEET_PATH).s?.find(
    ([name]) => name === "plain",
  )?.[1];

  expect(rules).toHaveLength(2);
  expect(JSON.stringify(rules)).toContain('"dir"');
  expect(
    recordedTransforms.filter(({ filePath }) => filePath === STYLESHEET_PATH),
  ).toStrictEqual([]);
});

test("an indented .sass stylesheet is compiled by Dart Sass before the native compiler sees it", async () => {
  await transform(
    CONFIG,
    PROJECT_ROOT,
    INDENTED_STYLESHEET_PATH,
    readFileSync(INDENTED_STYLESHEET_PATH),
    NATIVE_OPTIONS,
  );

  // `$accent` and the indented block are Sass alone, so the colour reaches the stylesheet only once Sass compiled it.
  expect(
    rulesFor(injectedStylesheet(INDENTED_STYLESHEET_PATH), "indented"),
  ).toContain('"color":"#00f"');
});

test("the injection module is transformed for the platform that asked", () => {
  expect(
    recordedTransforms.find(
      ({ filePath }) => filePath === `${STYLESHEET_PATH}.js`,
    )?.platform,
  ).toBe("ios");
});
