import { join } from "node:path";

import ts from "typescript";

export const root = join(__dirname, "../../..").replaceAll("\\", "/");

// The repository's own compiler options with exactOptionalPropertyTypes on, and a fixture's unused names allowed
export function compilerOptions(): ts.CompilerOptions {
  const { config } = ts.readConfigFile(`${root}/tsconfig.json`, (path) =>
    ts.sys.readFile(path),
  );
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, root);
  return {
    ...options,
    exactOptionalPropertyTypes: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
  };
}

export function createProgram(
  rootNames: readonly string[],
  virtualFiles: Readonly<Record<string, string>> = {},
): ts.Program {
  const options = compilerOptions();
  const host = ts.createCompilerHost(options, true);

  return ts.createProgram(rootNames, options, {
    ...host,
    getCurrentDirectory: () => root,
    fileExists: (name) => name in virtualFiles || host.fileExists(name),
    readFile: (name) => virtualFiles[name] ?? host.readFile(name),
    getSourceFile: (name, languageVersion, ...rest) => {
      const text = virtualFiles[name];
      return text === undefined
        ? host.getSourceFile(name, languageVersion, ...rest)
        : ts.createSourceFile(name, text, languageVersion, true);
    },
  });
}

export function createLanguageService(
  virtualFiles: Readonly<Record<string, string>>,
): ts.LanguageService {
  const options = compilerOptions();

  return ts.createLanguageService(
    {
      getScriptFileNames: () => Object.keys(virtualFiles),
      getScriptVersion: () => "1",
      getScriptSnapshot: (name) => {
        const text = virtualFiles[name] ?? ts.sys.readFile(name);
        return text === undefined
          ? undefined
          : ts.ScriptSnapshot.fromString(text);
      },
      getCurrentDirectory: () => root,
      getCompilationSettings: () => options,
      getDefaultLibFileName: ts.getDefaultLibFilePath,
      fileExists: (name) => name in virtualFiles || ts.sys.fileExists(name),
      readFile: (name) => virtualFiles[name] ?? ts.sys.readFile(name),
      readDirectory: (path, extensions, excludes, includes, depth) =>
        ts.sys.readDirectory(path, extensions, excludes, includes, depth),
      directoryExists: (name) => ts.sys.directoryExists(name),
      getDirectories: (name) => ts.sys.getDirectories(name),
    },
    ts.createDocumentRegistry(),
  );
}
