import { readdirSync, readFileSync } from "node:fs";
import { join, posix, relative, resolve, sep } from "node:path";

import ts from "typescript";

/**
 * The compiler runs at build time, inside Metro and inside this test suite. The
 * native runtime is a different plane: importing it evaluates `reactivity.ts`,
 * which registers a `Dimensions` and an `Appearance` listener at module scope.
 *
 * `verbatimModuleSyntax` is on, so only an `import type` / `export type`
 * declaration is elided. Any other form emits a `require`, even when every
 * specifier inside it is marked `type` and even when nothing is used — which
 * is what makes this class of mistake invisible in the source and visible only
 * in `dist`.
 */
const SOURCE_ROOT = resolve(__dirname, "..", "..");
const COMPILER_ROOT = join(SOURCE_ROOT, "compiler");
const RUNTIME_PLANES = ["native", "native-internal"];

interface RuntimeImport {
  /** Source file, relative to `src/` and POSIX separated. */
  from: string;
  /** The module specifier as written. */
  specifier: string;
}

function toPosix(path: string): string {
  return path.split(sep).join(posix.sep);
}

/**
 * Resolves a module specifier to a path relative to `src/`, or `undefined` for
 * an external package. `react-native-css/*` maps onto `src/*` — the alias the
 * root tsconfig declares and the one the source uses to cross plane
 * boundaries.
 */
function resolveWithinSource(
  specifier: string,
  fromFile: string,
): string | undefined {
  if (specifier.startsWith(".")) {
    return toPosix(relative(SOURCE_ROOT, resolve(fromFile, "..", specifier)));
  }

  if (specifier === "react-native-css") {
    return "index";
  }

  if (specifier.startsWith("react-native-css/")) {
    return specifier.slice("react-native-css/".length);
  }

  return undefined;
}

/**
 * Every module specifier a file imports for its runtime value, i.e. every one
 * that survives into the emitted JavaScript.
 */
function findEmittedSpecifiers(sourceText: string, fileName: string): string[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );

  const specifiers: string[] = [];

  for (const statement of sourceFile.statements) {
    let moduleSpecifier: ts.Expression | undefined;

    if (ts.isImportDeclaration(statement)) {
      // `type` is the only phase that elides the module reference. `defer`
      // still evaluates it, just later.
      if (statement.importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword) {
        continue;
      }
      moduleSpecifier = statement.moduleSpecifier;
    } else if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly) {
        continue;
      }
      moduleSpecifier = statement.moduleSpecifier;
    }

    if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
      specifiers.push(moduleSpecifier.text);
    }
  }

  return specifiers;
}

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(path);
    }

    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function findRuntimeImports(files: string[]): RuntimeImport[] {
  return files.flatMap((file) => {
    return findEmittedSpecifiers(readFileSync(file, "utf8"), file).flatMap(
      (specifier): RuntimeImport[] => {
        const target = resolveWithinSource(specifier, file);

        const crossesPlanes = RUNTIME_PLANES.some((plane) => {
          return target === plane || target?.startsWith(`${plane}/`);
        });

        return crossesPlanes
          ? [{ from: toPosix(relative(SOURCE_ROOT, file)), specifier }]
          : [];
      },
    );
  });
}

describe("the emitted-specifier detector", () => {
  const cases: [description: string, source: string, emitted: string[]][] = [
    ["a type-only import", `import type { A } from "./a";`, []],
    ["a type-only namespace import", `import type * as A from "./a";`, []],
    ["a type-only re-export", `export type { A } from "./a";`, []],
    ["a type-only star re-export", `export type * from "./a";`, []],
    ["a value import", `import { a } from "./a";`, ["./a"]],
    ["a default import", `import a from "./a";`, ["./a"]],
    ["a side-effect import", `import "./a";`, ["./a"]],
    ["a value re-export", `export * from "./a";`, ["./a"]],
    // verbatimModuleSyntax keeps the declaration, so the module is still
    // evaluated. This is exactly the shape the invariant below exists for.
    ["inline type specifiers", `import { type A } from "./a";`, ["./a"]],
    ["a local export", `export const a = 1;`, []],
  ];

  test.each(cases)("%s emits %j", (_description, source, emitted) => {
    expect(findEmittedSpecifiers(source, "probe.ts")).toStrictEqual(emitted);
  });
});

describe("compiler sources", () => {
  const files = listSourceFiles(COMPILER_ROOT);

  test("the scan reaches the whole compiler directory", () => {
    const scanned = files.map((file) => toPosix(relative(SOURCE_ROOT, file)));

    expect(scanned).toContain("compiler/compiler.types.ts");
    expect(scanned).toContain("compiler/compiler.ts");
    expect(scanned).toContain("compiler/index.ts");
    expect(scanned.length).toBeGreaterThan(10);
  });

  test("the scan sees the imports the compiler really has", () => {
    const specifiers = files.flatMap((file) => {
      return findEmittedSpecifiers(readFileSync(file, "utf8"), file);
    });

    expect(specifiers).toContain("./atRules");
    expect(specifiers).toContain("lightningcss");
  });

  test("no compiler source imports the native runtime for its value", () => {
    expect(findRuntimeImports(files)).toStrictEqual([]);
  });
});
