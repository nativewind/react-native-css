import { readFileSync } from "node:fs";
import path from "node:path";

import type {
  JsTransformerConfig,
  JsTransformOptions,
} from "metro-transform-worker";
import type { ReactNativeCssStyleSheet } from "react-native-css/compiler";

import { transform } from "../../metro/metro-transformer";
import { recordedTransforms } from "./_expo-worker";

jest.mock("@expo/metro-config", () => ({
  unstable_transformerPath: require.resolve("./_expo-worker"),
}));

interface SassCall {
  readonly filename: string;
  readonly src: string;
  readonly syntax: string;
}

const sassCalls: SassCall[] = [];

// Expo resolves `sass` from the PROJECT root and throws when it is absent, so the real compiler is
// unreachable from this repo's dev dependencies. Standing in for it keeps the arm drivable and
// asserts the hand-off — which syntax the transformer names, and that the Sass output is what
// reaches the compiler rather than the authored source.
jest.mock("@expo/metro-config/build/transform-worker/sass", () => ({
  matchSass: (filename: string): string | null =>
    filename.endsWith(".scss") ? "scss" : null,
  compileSass: (
    _projectRoot: string,
    input: { filename: string; src: string },
    options: { syntax: string },
  ): { src: string } => {
    sassCalls.push({ ...input, syntax: options.syntax });
    return { src: ".sassy { color: #f00; }\n.sassy.nested { color: #00f; }" };
  },
}));

// Standing in for the project's PostCSS marks its output, so Sass is seen receiving it rather than the authored file.
jest.mock("@expo/metro-config/build/transform-worker/postcss", () => ({
  transformPostCssModule: (
    _projectRoot: string,
    input: { src: string },
  ): Promise<{ src: string; hasPostcss: boolean }> =>
    Promise.resolve({
      src: `${input.src}\n/* from postcss */`,
      hasPostcss: true,
    }),
}));

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

test("a .scss entry is compiled by Sass before the native compiler sees it", () => {
  expect(sassCalls).toHaveLength(1);
  expect(sassCalls[0]?.syntax).toBe("scss");
  expect(sassCalls[0]?.filename).toBe(STYLESHEET_PATH);
});

test("Sass compiles what the project's PostCSS produced, as Expo's web transform orders them", () => {
  expect(sassCalls[0]?.src).toBe(
    `${readFileSync(STYLESHEET_PATH, "utf8")}\n/* from postcss */`,
  );
});

test("what Sass produced is the input, not the authored source", () => {
  // The authored file nests `&.nested` inside `.sassy` and names a `$brand` variable, neither of
  // which is CSS — so a rule for the nested class exists only if the Sass output was compiled.
  const names = injectedStylesheet().s?.map(([name]) => name) ?? [];

  expect(names).toContain("sassy");
  expect(names).toContain("nested");
  expect(sassCalls[0]?.src).toContain("$brand");
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
