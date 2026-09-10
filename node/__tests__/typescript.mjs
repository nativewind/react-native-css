import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const { setupTypeScript } =
  /** @type {{setupTypeScript: (envPath?: string, name?: string) => void}} */ (
    require(
      String(
        process.env.CSS_TYPESCRIPT_SETUP_ENTRY ??
          "../../dist/commonjs/metro/typescript.js",
      ),
    )
  );

const scenarios = [
  {
    name: "relative inherited files",
    config: { extends: "./config/base.json" },
    basePath: "config/base.json",
    base: { files: ["../src/app.ts"] },
  },
  { name: "implicit include", config: {} },
  { name: "explicit include", config: { include: ["src"] } },
  {
    name: "inherited include",
    config: { extends: "./base.json" },
    base: { include: ["src"] },
  },
  { name: "files only", config: { files: ["src/app.ts"] } },
  {
    name: "inherited files",
    config: { extends: "./base.json" },
    base: { files: ["src/app.ts"] },
  },
  {
    name: "excluded environment",
    config: { exclude: ["react-native-css-env.d.ts"] },
  },
  {
    name: "inherited exclusion",
    config: { extends: "./base.json" },
    base: { exclude: ["react-native-css-env.d.ts"] },
  },
  { name: "nested invocation", config: { include: ["src"] }, cwd: "src" },
  {
    name: "custom environment",
    config: { include: ["src"] },
    env: "custom.d.ts",
  },
  {
    name: "relative inherited include",
    config: { extends: "./config/base.json" },
    basePath: "config/base.json",
    base: { include: ["../src"] },
  },
];
for (const scenario of scenarios) {
  await test(`TypeScript setup includes declarations and preserves project files: ${scenario.name}`, () => {
    const directory = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "css-typescript-")),
    );
    const previous = process.cwd();
    try {
      fs.mkdirSync(directory + "/src");
      fs.writeFileSync(directory + "/src/app.ts", "export const value = 1;");
      fs.writeFileSync(directory + "/outside.ts", "export const outside = 1;");
      fs.writeFileSync(
        directory + "/tsconfig.json",
        "// Preserve this project comment\n" + JSON.stringify(scenario.config),
      );
      if (scenario.base) {
        const file = directory + "/" + (scenario.basePath ?? "base.json");
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(scenario.base));
      }
      const parsed = () =>
        ts.getParsedCommandLineOfConfigFile(
          directory + "/tsconfig.json",
          {},
          {
            ...ts.sys,
            onUnRecoverableConfigFileDiagnostic: (d) => {
              throw new Error(
                ts.flattenDiagnosticMessageText(d.messageText, "\n"),
              );
            },
          },
        );
      const before = parsed().fileNames;
      process.chdir(directory + (scenario.cwd ? "/" + scenario.cwd : ""));
      const env = scenario.env ?? "react-native-css-env.d.ts";
      setupTypeScript(scenario.env);
      const envFile = path.resolve(env);
      assert(fs.existsSync(envFile));
      const after = parsed().fileNames;
      assert(
        after.includes(envFile),
        "Generated declaration is absent from the TypeScript project",
      );
      assert.deepEqual(
        after.filter((f) => f !== envFile).sort(),
        before.sort(),
        "Existing project membership changed",
      );
      const configBytes = fs.readFileSync(directory + "/tsconfig.json", "utf8");
      const envBytes = fs.readFileSync(envFile, "utf8");
      assert(configBytes.includes("// Preserve this project comment"));
      setupTypeScript(scenario.env);
      assert.equal(
        fs.readFileSync(directory + "/tsconfig.json", "utf8"),
        configBytes,
      );
      assert.equal(fs.readFileSync(envFile, "utf8"), envBytes);
    } finally {
      process.chdir(previous);
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
}

await test("TypeScript setup preserves a user owned environment file", () => {
  const directory = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "css-typescript-")),
  );
  const previous = process.cwd();
  try {
    process.chdir(directory);
    fs.writeFileSync("tsconfig.json", '{"include":[]}');
    fs.writeFileSync("custom.d.ts", "// existing custom declaration\n");
    setupTypeScript("custom.d.ts");
    assert.equal(
      fs.readFileSync("custom.d.ts", "utf8"),
      "// existing custom declaration\n",
    );
  } finally {
    process.chdir(previous);
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

for (const content of [null, "invalid config", "[]"]) {
  await test(`TypeScript setup leaves unavailable or invalid configs alone: ${content}`, () => {
    const directory = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "css-typescript-")),
    );
    const previous = process.cwd();
    try {
      process.chdir(directory);
      if (content !== null) fs.writeFileSync("tsconfig.json", content);
      setupTypeScript();
      assert(!fs.existsSync("react-native-css-env.d.ts"));
      if (content !== null)
        assert.equal(fs.readFileSync("tsconfig.json", "utf8"), content);
    } finally {
      process.chdir(previous);
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
}
