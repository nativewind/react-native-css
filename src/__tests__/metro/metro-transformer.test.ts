import { join } from "path";

import type {
  JsTransformerConfig,
  JsTransformOptions,
  TransformResponse,
} from "metro-transform-worker";

import type { CompilerOptions } from "../../compiler";
import { transform } from "../../metro/metro-transformer";
import type { WarningLevel } from "../../metro/warnings";

/**
 * The transformer under test is the boundary a real build crosses: Metro hands
 * it a `.css` file and it hands back JS. Nothing here is faked — the stock
 * Expo transform worker runs, lightningcss runs, and `compile()` runs — so a
 * warning observed on `console.warn` is a warning a developer running
 * `expo start` would see.
 */

const PROJECT_ROOT = process.cwd();

const CONFIG: JsTransformerConfig & {
  reactNativeCSS?: (CompilerOptions & { warnings?: WarningLevel }) | undefined;
} = {
  allowOptionalDependencies: true,
  assetPlugins: [],
  assetRegistryPath: "react-native/Libraries/Image/AssetRegistry",
  asyncRequireModulePath: "metro-runtime/src/modules/asyncRequire",
  babelTransformerPath: require.resolve(
    "@expo/metro-config/build/babel-transformer",
  ),
  dynamicDepsInPackages: "reject",
  enableBabelRCLookup: false,
  enableBabelRuntime: true,
  globalPrefix: "",
  hermesParser: false,
  minifierConfig: {},
  minifierPath: "metro-minify-terser",
  optimizationSizeLimit: 150 * 1024,
  publicPath: "/assets",
  unstable_allowRequireContext: false,
  unstable_collectDependenciesPath: require.resolve(
    "metro/private/ModuleGraph/worker/collectDependencies",
  ),
  unstable_compactOutput: false,
  unstable_disableModuleWrapping: false,
  unstable_disableNormalizePseudoGlobals: false,
};

const OPTIONS: JsTransformOptions = {
  customTransformOptions: {},
  dev: true,
  experimentalImportSupport: false,
  hot: false,
  inlinePlatform: true,
  inlineRequires: false,
  minify: false,
  platform: "ios",
  type: "module",
  unstable_transformProfile: "default",
};

const written: string[] = [];

beforeEach(() => {
  written.length = 0;
  jest.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    written.push(args.map((arg) => String(arg)).join(" "));
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * Metro's own dependencies write to `console.warn` during a transform
 * (browserslist announces the age of its data, for one), so the assertion is
 * over this package's lines rather than over every line.
 */
function reported(): string[] {
  return written.filter((message) => message.startsWith("react-native-css:"));
}

function runTransform(options: {
  css: string;
  name: string;
  platform?: string;
  warnings?: WarningLevel;
}): Promise<TransformResponse> {
  return transform(
    options.warnings === undefined
      ? CONFIG
      : { ...CONFIG, reactNativeCSS: { warnings: options.warnings } },
    PROJECT_ROOT,
    join(PROJECT_ROOT, "src", options.name),
    Buffer.from(options.css),
    { ...OPTIONS, platform: options.platform ?? OPTIONS.platform },
  );
}

test("a dropped declaration reaches the terminal running the bundler", async () => {
  const output = await runTransform({
    css: `.a { float: left; z-index: auto; color: red; }`,
    name: "surfaced.css",
  });

  expect(reported()).toStrictEqual([
    [
      `react-native-css: ${join("src", "surfaced.css")} - 2 declarations dropped, no React Native equivalent`,
      "  properties: float",
      "  values: z-index: auto",
    ].join("\n"),
  ]);

  // The declaration the compiler DID understand still ships, so the warning is
  // advisory rather than a refusal to build.
  expect(JSON.stringify(output.output[0])).toContain("color");
});

test("a stylesheet the compiler fully understood says nothing", async () => {
  await runTransform({
    css: `.a { color: red; }`,
    name: "clean.css",
  });

  expect(reported()).toStrictEqual([]);
});

test('"none" silences a stylesheet that would otherwise warn', async () => {
  await runTransform({
    css: `.a { float: left; }`,
    name: "silenced.css",
    warnings: "none",
  });

  expect(reported()).toStrictEqual([]);
});

test('"verbose" lifts the cap', async () => {
  await runTransform({
    css: `.a { border-style: hidden; }
.b { border-style: double; }
.c { border-style: groove; }
.d { border-style: ridge; }
.e { border-style: inset; }
.f { border-style: outset; }
.g { border-style: none; }`,
    name: "verbose.css",
    warnings: "verbose",
  });

  expect(reported()[0]).toContain(
    "values: border-style: double, groove, hidden, inset, none, outset, ridge",
  );
});

test("re-transforming the same file with the same warnings reports once", async () => {
  const css = `.a { float: left; }`;

  await runTransform({ css, name: "rebuilt.css" });
  await runTransform({ css, name: "rebuilt.css" });
  await runTransform({ css: `${css} .b { color: red; }`, name: "rebuilt.css" });

  expect(reported()).toHaveLength(1);
});

test("re-transforming the same file with new warnings reports again", async () => {
  await runTransform({ css: `.a { float: left; }`, name: "edited.css" });
  await runTransform({
    css: `.a { float: left; z-index: auto; }`,
    name: "edited.css",
  });

  const calls = reported();
  expect(calls).toHaveLength(2);
  expect(calls[1]).toContain("values: z-index: auto");
});

test("web reports nothing, because web never reaches the compiler", async () => {
  const output = await runTransform({
    css: `.a { float: left; z-index: auto; }`,
    name: "web.css",
    platform: "web",
  });

  expect(reported()).toStrictEqual([]);

  // Not silence from having done nothing: the stock Expo transformer handled
  // the file and emitted the CSS whole, `float` included. There is no compile
  // on this platform, so this branch produces no warnings to surface; the
  // native branch above is the only one that produces them.
  const web = output as TransformResponse & {
    output: [{ data: { css: { code: Buffer } } }];
  };
  expect(web.output[0].data.css.code.toString()).toContain("float");
});

test("a file that is not CSS is passed through untouched", async () => {
  await transform(
    CONFIG,
    PROJECT_ROOT,
    join(PROJECT_ROOT, "src", "component.tsx"),
    Buffer.from(`export const value = 1;`),
    OPTIONS,
  );

  expect(reported()).toStrictEqual([]);
});
