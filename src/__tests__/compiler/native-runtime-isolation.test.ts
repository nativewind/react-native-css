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

/**
 * The module whose evaluation is the cost, stated once and reached through the
 * graph rather than named a second time as a directory census.
 *
 * A list of runtime directories has to be kept in step with every entry point
 * that leads into one, and the entry points are exactly what a compiler source
 * would write: `react-native-css` re-exports `runtime`, which on the native
 * platform is `runtime.native`, which is the whole native plane. None of those
 * three module ids sits under a runtime directory, so a directory census reads
 * them as unrelated to it while they pull all of it.
 */
const RUNTIME_ROOT = "native/reactivity";

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
 * Resolves a module specifier to a module id — a path relative to `src/`, with
 * no extension — or `undefined` for an external package. `react-native-css/*`
 * maps onto `src/*`, the alias the root tsconfig declares and the one the
 * source uses to cross plane boundaries.
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
 * Every module specifier a file references for its runtime value, i.e. every
 * one that survives into the emitted JavaScript.
 *
 * A `require(...)` or a dynamic `import(...)` inside a function body counts:
 * the reference survives emit, and this repo already writes them deliberately
 * (`components/index.cts` lazily requires every component). Whether the module
 * is evaluated eagerly or on first call is a question for
 * `native/runtime-boot.test.ts`, which measures evaluation; this scan asks only
 * whether the reference is there.
 */
function findEmittedSpecifiers(sourceText: string, fileName: string): string[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );

  const specifiers: string[] = [];

  const read = (node: ts.Node): void => {
    let moduleSpecifier: ts.Expression | undefined;

    if (ts.isImportDeclaration(node)) {
      // `type` is the only phase that elides the module reference. `defer`
      // still evaluates it, just later.
      if (node.importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword) {
        return;
      }
      moduleSpecifier = node.moduleSpecifier;
    } else if (ts.isExportDeclaration(node)) {
      if (node.isTypeOnly) {
        return;
      }
      moduleSpecifier = node.moduleSpecifier;
    } else if (ts.isCallExpression(node)) {
      const isRequire =
        ts.isIdentifier(node.expression) && node.expression.text === "require";
      const isDynamicImport =
        node.expression.kind === ts.SyntaxKind.ImportKeyword;

      if (isRequire || isDynamicImport) {
        moduleSpecifier = node.arguments[0];
      }
    }

    if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
      specifiers.push(moduleSpecifier.text);
    }

    ts.forEachChild(node, read);
  };

  ts.forEachChild(sourceFile, read);

  return specifiers;
}

/**
 * The module id a file answers to, i.e. its path with the extension and any
 * platform suffix removed. `runtime.native.ts` answers to `runtime`, because
 * that is the specifier a bundler resolves it through on native.
 */
function moduleIdOf(relativePath: string): string {
  return relativePath.replace(/(\.(native|web|ios|android))?\.[cm]?tsx?$/, "");
}

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(path);
    }

    // A declaration file emits nothing, so it has no module reference to find.
    return /\.[cm]?tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")
      ? [path]
      : [];
  });
}

/**
 * Every file each module id resolves to.
 *
 * A platform-suffixed file is registered under both its bare id and its
 * literal path, because both are written: `./runtime` picks whichever variant
 * the platform has, and `./runtime.native` names one directly. An id with
 * several variants keeps all of them — the question this suite asks is whether
 * a specifier can reach the runtime on ANY platform, and answering it for the
 * platform that happens to be running is how `runtime.native` stayed invisible.
 */
function indexSourceFiles(files: string[]): Map<string, string[]> {
  const byId = new Map<string, string[]>();

  const register = (id: string, file: string): void => {
    const existing = byId.get(id);

    if (existing) {
      existing.push(file);
    } else {
      byId.set(id, [file]);
    }
  };

  for (const file of files) {
    const relativePath = toPosix(relative(SOURCE_ROOT, file));
    const id = moduleIdOf(relativePath);
    const literal = relativePath.replace(/\.[cm]?tsx?$/, "");

    register(id, file);

    if (literal !== id) {
      register(literal, file);
    }
  }

  return byId;
}

const sourceFiles = listSourceFiles(SOURCE_ROOT);
const filesById = indexSourceFiles(sourceFiles);

const specifiersByFile = new Map(
  sourceFiles.map((file): [string, string[]] => {
    return [file, findEmittedSpecifiers(readFileSync(file, "utf8"), file)];
  }),
);

/** The files a module id resolves to, directory `index` included. */
function filesFor(moduleId: string): string[] {
  return filesById.get(moduleId) ?? filesById.get(`${moduleId}/index`) ?? [];
}

/**
 * Whether evaluating this module id can reach {@link RUNTIME_ROOT}, through any
 * number of hops and on any platform.
 *
 * The transitive walk is the point: a check that reads the specifier a compiler
 * file wrote and asks whether it names a runtime directory cannot see a path
 * through a third directory, nor one through the package's own entry point.
 */
function reachesRuntime(moduleId: string): boolean {
  const seen = new Set<string>();
  let frontier = [moduleId];

  while (frontier.length > 0) {
    const next: string[] = [];

    for (const id of frontier) {
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);

      if (id === RUNTIME_ROOT) {
        return true;
      }

      for (const file of filesFor(id)) {
        const relativePath = toPosix(relative(SOURCE_ROOT, file));

        if (moduleIdOf(relativePath) === RUNTIME_ROOT) {
          return true;
        }

        for (const specifier of specifiersByFile.get(file) ?? []) {
          const target = resolveWithinSource(specifier, file);

          if (target !== undefined) {
            next.push(target);
          }
        }
      }
    }

    frontier = next;
  }

  return false;
}

function findRuntimeImports(files: string[]): RuntimeImport[] {
  return files.flatMap((file) => {
    return (specifiersByFile.get(file) ?? []).flatMap(
      (specifier): RuntimeImport[] => {
        const target = resolveWithinSource(specifier, file);

        return target !== undefined && reachesRuntime(target)
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
    // A reference inside a function body survives emit too, so the scan has to
    // walk past the top-level statements to find it.
    [
      "a require inside a function",
      `export function a() { return require("./a"); }`,
      ["./a"],
    ],
    [
      "a dynamic import inside a function",
      `export async function a() { return import("./a"); }`,
      ["./a"],
    ],
    [
      "a require with a computed specifier",
      `export function a(name: string) { return require(name); }`,
      [],
    ],
  ];

  test.each(cases)("%s emits %j", (_description, source, emitted) => {
    expect(findEmittedSpecifiers(source, "probe.ts")).toStrictEqual(emitted);
  });
});

describe("the module graph", () => {
  /**
   * The graph decides the invariant below, so an empty or mis-resolving one
   * would pass it by finding nothing. These guards are what make the scan's
   * silence mean something.
   */
  test("the scan reaches the whole source tree", () => {
    const scanned = sourceFiles.map((file) => {
      return toPosix(relative(SOURCE_ROOT, file));
    });

    expect(scanned).toContain("index.ts");
    expect(scanned).toContain("runtime.ts");
    expect(scanned).toContain("runtime.native.ts");
    expect(scanned).toContain("native/reactivity.ts");
    expect(scanned.length).toBeGreaterThan(100);
  });

  test("the runtime root resolves to a file", () => {
    // Rename or move `native/reactivity` and every reachability answer below
    // silently becomes `false`, which is the one way this suite could pass by
    // measuring nothing.
    expect(filesFor(RUNTIME_ROOT)).toHaveLength(1);
  });

  test("a platform-suffixed module answers to both of its specifiers", () => {
    expect(filesFor("runtime")).toHaveLength(2);
    expect(filesFor("runtime.native")).toHaveLength(1);
  });

  /**
   * What the invariant discriminates, stated as a table rather than left to the
   * one negative assertion below. Every id on the true side is something a
   * compiler source could plausibly write, and each one is a way into the whole
   * native plane.
   */
  const reachability: [moduleId: string, reaches: boolean][] = [
    // The package's own entry points. `index` re-exports `runtime`, and
    // `runtime` is `runtime.native` on the native platform.
    ["index", true],
    ["runtime", true],
    ["runtime.native", true],
    ["native", true],
    ["native/reactivity", true],
    ["native-internal", true],
    ["components", true],
    // The build-time and web planes, which is what this directory is.
    ["compiler", false],
    ["web", false],
    ["babel", false],
    ["metro", false],
    ["utilities", false],
  ];

  test.each(reachability)(
    "%s reaches the native runtime: %s",
    (id, reaches) => {
      expect(reachesRuntime(id)).toBe(reaches);
    },
  );
});

describe("compiler sources", () => {
  const files = listSourceFiles(COMPILER_ROOT);

  test("the scan reaches the whole compiler directory", () => {
    const scanned = files.map((file) => toPosix(relative(SOURCE_ROOT, file)));

    expect(scanned).toContain("compiler/compiler.types.ts");
    expect(scanned).toContain("compiler/compiler.ts");
    expect(scanned).toContain("compiler/index.ts");
    // `inheritance.test.ts` sits in this directory rather than under
    // `__tests__`, so bob compiles it into `dist` and the package ships it. It
    // is scanned for that reason, not by oversight.
    expect(scanned).toContain("compiler/inheritance.test.ts");
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
