import { readFileSync } from "node:fs";
import path from "node:path";

import type {
  JsTransformerConfig,
  JsTransformOptions,
} from "metro-transform-worker";
import type { ReactNativeCssStyleSheet } from "react-native-css/compiler";

import { transform } from "../../metro/metro-transformer";
import { recordedTransforms, TRANSFORM_TIMEOUT_MS } from "./_expo-worker";

jest.mock("@expo/metro-config", () => ({
  unstable_transformerPath: require.resolve("./_expo-worker"),
}));

jest.setTimeout(TRANSFORM_TIMEOUT_MS);

// Its own file: Expo resolves a project's PostCSS pipeline once per process, so a project WITHOUT a
// config has to be the first one this process sees.
const PROJECT_ROOT = path.join(__dirname, "_project-plain");
const STYLESHEET_PATH = path.join(PROJECT_ROOT, "global.css");

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

function injectedStylesheet(): ReactNativeCssStyleSheet {
  const injection = recordedTransforms.find(
    ({ filePath }) => filePath === `${STYLESHEET_PATH}.js`,
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
  const rules = injectedStylesheet().s?.find(([name]) => name === "plain")?.[1];

  expect(rules).toHaveLength(2);
  expect(JSON.stringify(rules)).toContain('"dir"');
  expect(
    recordedTransforms.filter(({ filePath }) => filePath === STYLESHEET_PATH),
  ).toStrictEqual([]);
});

test("the injection module is transformed for the platform that asked", () => {
  expect(
    recordedTransforms.find(
      ({ filePath }) => filePath === `${STYLESHEET_PATH}.js`,
    )?.platform,
  ).toBe("ios");
});
