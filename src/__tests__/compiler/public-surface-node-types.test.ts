import path from "node:path";

import ts from "typescript";

// `native/conditions/index.d.ts` imports `StyleRule` from `react-native-css/compiler`, so a Node
// global in that surface is a TS2591 inside `node_modules` for any consumer without `@types/node`.
const COMPILER_ENTRY = path.join(__dirname, "../../compiler/index.ts");

const OPTIONS: ts.CompilerOptions = {
  lib: ["lib.es2024.d.ts"],
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  noEmit: true,
  skipLibCheck: true,
  strict: true,
  target: ts.ScriptTarget.ES2022,
  types: [],
};

function checkCompilerSurface(
  options: ts.CompilerOptions,
): readonly ts.Diagnostic[] {
  return ts.getPreEmitDiagnostics(ts.createProgram([COMPILER_ENTRY], options));
}

function namesMissing(
  diagnostics: readonly ts.Diagnostic[],
  name: string,
): readonly string[] {
  return diagnostics
    .map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
    )
    .filter((message) => message.includes(`Cannot find name '${name}'`));
}

test("no Node global reaches the compiler's public surface", () => {
  expect(namesMissing(checkCompilerSurface(OPTIONS), "Buffer")).toStrictEqual(
    [],
  );
});

test("the probe reports a missing global when one is genuinely absent", () => {
  // Without this, the assertion above is satisfied by a program that resolved nothing.
  const onES5 = checkCompilerSurface({ ...OPTIONS, lib: ["lib.es5.d.ts"] });

  expect(onES5.length).toBeGreaterThan(0);
});
