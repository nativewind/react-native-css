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

const PROJECT_ROOT = path.join(__dirname, "_project");
const STYLESHEET_PATH = path.join(PROJECT_ROOT, "global.css");

// The transformer forwards the config to the worker untouched and reads nothing else from it.
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

function rulesFor(
  stylesheet: ReactNativeCssStyleSheet,
  className: string,
): string | undefined {
  const entry = stylesheet.s?.find(([name]) => name === className);
  return entry ? JSON.stringify(entry[1]) : undefined;
}

/** The response with the CSS metadata the transformer attaches — the shape it declares itself. */
type StylesheetTransformResponse = Awaited<ReturnType<typeof transform>> & {
  output: [{ data: { css: unknown } }];
};

let response: StylesheetTransformResponse;

beforeAll(async () => {
  response = (await transform(
    CONFIG,
    PROJECT_ROOT,
    STYLESHEET_PATH,
    readFileSync(STYLESHEET_PATH),
    NATIVE_OPTIONS,
  )) as StylesheetTransformResponse;
});

test("the native stylesheet is what the project's PostCSS produced", () => {
  // Only Tailwind emits this class; the authored stylesheet merely names it.
  expect(rulesFor(injectedStylesheet(), "bg-[#00f]")).toContain(
    '"backgroundColor":"#00f"',
  );
});

test("a theme colour declared once is inlined, because no browser build doubled its declaration", () => {
  const brandRule = rulesFor(injectedStylesheet(), "bg-brand");

  expect(brandRule).toContain('"backgroundColor":"#');
  expect(brandRule).not.toContain('"var"');
});

test("the stylesheet's own output is emptied and marked uncacheable, since PostCSS reads other files", () => {
  expect(response.output[0].data.css).toStrictEqual({
    skipCache: true,
    code: "",
  });
});

test("the native stylesheet is compiled from the authored CSS, never from a browser build of it", () => {
  const rtlRule = rulesFor(injectedStylesheet(), "rtl:bg-[#f00]");

  expect(rtlRule).toContain('"dir"');
  expect(rtlRule).toContain('"rtl"');
  expect(
    recordedTransforms.filter(({ filePath }) => filePath === STYLESHEET_PATH),
  ).toStrictEqual([]);
});

test("the injection module replaces the stylesheet as the module's code", () => {
  const injection = recordedTransforms.find(
    ({ filePath }) => filePath === `${STYLESHEET_PATH}.js`,
  );

  expect(injection?.platform).toBe("android");
  expect(injection?.source).toContain(
    'import { StyleCollection } from "react-native-css/native-internal";',
  );
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

test("a module that is not a stylesheet reaches the worker untouched", async () => {
  const modulePath = path.join(PROJECT_ROOT, "module.js");
  const source = Buffer.from("export const untouched = 1;\n");

  await transform(CONFIG, PROJECT_ROOT, modulePath, source, NATIVE_OPTIONS);

  const moduleTransform = recordedTransforms.find(
    ({ filePath }) => filePath === modulePath,
  );
  expect(moduleTransform?.platform).toBe("android");
  expect(moduleTransform?.source).toBe(source.toString());
});

test("a stylesheet requested as an asset reaches the worker untouched", async () => {
  const assetPath = path.join(PROJECT_ROOT, "asset.css");
  const source = Buffer.from(".asset { color: red; }\n");

  await transform(CONFIG, PROJECT_ROOT, assetPath, source, {
    ...NATIVE_OPTIONS,
    type: "asset",
  });

  const assetTransform = recordedTransforms.find(
    ({ filePath }) => filePath === assetPath,
  );
  expect(assetTransform?.source).toBe(source.toString());
});
