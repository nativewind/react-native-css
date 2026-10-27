import { join } from "path";

import type { JsTransformOptions } from "metro-transform-worker";

import { transform } from "../../metro/metro-transformer";
import type { WarningLevel } from "../../metro/warnings";

type TransformerConfig = Parameters<typeof transform>[0];

jest.mock("@expo/metro-config", () => ({
  unstable_transformerPath: require.resolve("./_transform-worker"),
}));

const PROJECT_ROOT = process.cwd();

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

function reported(): string[] {
  return written.filter((message) => message.startsWith("react-native-css:"));
}

function runTransform(options: {
  css: string;
  name: string;
  platform?: string;
  warnings?: WarningLevel;
}) {
  // The stand-in worker reads neither, so each carries only what the transformer reads
  const config: Pick<TransformerConfig, "reactNativeCSS"> = {
    reactNativeCSS:
      options.warnings === undefined
        ? undefined
        : { warnings: options.warnings },
  };
  const transformOptions: Pick<JsTransformOptions, "type" | "platform"> = {
    type: "module",
    platform: options.platform ?? "ios",
  };

  return transform(
    config as TransformerConfig,
    PROJECT_ROOT,
    join(PROJECT_ROOT, "src", options.name),
    Buffer.from(options.css),
    transformOptions as JsTransformOptions,
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
  expect(JSON.stringify(output.output[0])).toContain("color");
});

test("a stylesheet the compiler fully understood says nothing", async () => {
  await runTransform({ css: `.a { color: red; }`, name: "clean.css" });

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

test("a rebuilt file reports again only when its warnings change", async () => {
  const css = `.a { float: left; }`;

  await runTransform({ css, name: "rebuilt.css" });
  await runTransform({ css, name: "rebuilt.css" });
  await runTransform({ css: `${css} .b { color: red; }`, name: "rebuilt.css" });
  await runTransform({
    css: `${css} .b { z-index: auto; }`,
    name: "rebuilt.css",
  });

  const calls = reported();
  expect(calls).toHaveLength(2);
  expect(calls[1]).toContain("values: z-index: auto");
});

test("web reports nothing, because web never reaches the compiler", async () => {
  await runTransform({
    css: `.a { float: left; z-index: auto; }`,
    name: "web.css",
    platform: "web",
  });

  expect(reported()).toStrictEqual([]);
});

test("a file that is not CSS is passed through untouched", async () => {
  await runTransform({
    css: `export const value = 1;`,
    name: "component.tsx",
  });

  expect(reported()).toStrictEqual([]);
});
