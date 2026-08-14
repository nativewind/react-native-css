import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve, sep } from "path";

import {
  findPackageRoot,
  resolveImportSource,
  toPosixPath,
} from "../../babel/helpers";

/**
 * `path.resolve` prepends the cwd's drive on Windows and nothing on POSIX. The
 * drive is not part of what any case here pins, so it is dropped before
 * comparing and one literal expectation serves both hosts.
 */
function withoutDrive(path: string): string {
  return path.replace(/^[A-Za-z]:/, "");
}

const WINDOWS_SEPARATOR = "\\";
const POSIX_SEPARATOR = "/";

describe("toPosixPath", () => {
  // Every case supplies the host separator, so both branches are exercised on
  // any host — including ubuntu-latest, the only platform CI runs. Inputs are
  // Windows-shaped literals rather than `path.resolve` output for the same
  // reason: `resolve()` on Linux never emits a backslash, so a table driven
  // through it would assert nothing there.
  const cases: {
    name: string;
    input: string;
    hostSeparator: string;
    expected: string;
  }[] = [
    {
      name: "an absolute Windows path",
      input: "C:\\project\\node_modules\\react-native-web\\dist\\exports\\View",
      hostSeparator: WINDOWS_SEPARATOR,
      expected: "C:/project/node_modules/react-native-web/dist/exports/View",
    },
    {
      name: "an already-POSIX path, unchanged",
      input: "/project/node_modules/react-native-web/dist/exports/View",
      hostSeparator: POSIX_SEPARATOR,
      expected: "/project/node_modules/react-native-web/dist/exports/View",
    },
    {
      name: "mixed separators, every one of them",
      input: "C:/project\\node_modules/react-native\\Libraries",
      hostSeparator: WINDOWS_SEPARATOR,
      expected: "C:/project/node_modules/react-native/Libraries",
    },
    {
      name: "a UNC-style prefix, both leading separators",
      input: "\\\\build-server\\share\\project\\index.js",
      hostSeparator: WINDOWS_SEPARATOR,
      expected: "//build-server/share/project/index.js",
    },
    {
      name: "a POSIX filename whose own name contains a backslash, left intact",
      // The gate's reason to exist: on POSIX this is one file called
      // `weird\name.js`, and splitting it would name a path that does not exist.
      input: "/project/weird\\name.js",
      hostSeparator: POSIX_SEPARATOR,
      expected: "/project/weird\\name.js",
    },
    {
      name: "the same characters on a Windows host, split into segments",
      // Same input, opposite verdict — so what decides is the host separator,
      // not anything about the string.
      input: "/project/weird\\name.js",
      hostSeparator: WINDOWS_SEPARATOR,
      expected: "/project/weird/name.js",
    },
    {
      name: "a relative path",
      input: "..\\View\\View.js",
      hostSeparator: WINDOWS_SEPARATOR,
      expected: "../View/View.js",
    },
    {
      name: "a trailing separator, preserved as a POSIX one",
      input: "C:\\project\\dist\\",
      hostSeparator: WINDOWS_SEPARATOR,
      expected: "C:/project/dist/",
    },
    {
      name: "the empty string on a Windows host",
      input: "",
      hostSeparator: WINDOWS_SEPARATOR,
      expected: "",
    },
    {
      name: "the empty string on a POSIX host",
      input: "",
      hostSeparator: POSIX_SEPARATOR,
      expected: "",
    },
  ];

  test.each(cases)("$name", ({ input, hostSeparator, expected }) => {
    expect(toPosixPath(input, hostSeparator)).toBe(expected);
  });

  test("makes the marker the import handlers split on findable", () => {
    // The defect itself: the resolved path plainly contains those directories,
    // and the forward-slash marker is absent from it until this runs.
    const resolved =
      "C:\\project\\node_modules\\react-native\\Libraries\\Components\\View\\View";
    const marker = "react-native/Libraries/Components/";
    const posix = toPosixPath(resolved, WINDOWS_SEPARATOR);

    expect(resolved).not.toContain(marker);
    expect(posix).toContain(marker);
    expect(posix.split(marker)[1]).toBe("View/View");
  });
});

describe("resolveImportSource", () => {
  // The base is `dirname(filename)`, and every case below observes that by
  // counting `..` segments — falsifiable on any host.
  const filename =
    "/project/node_modules/react-native-web/dist/exports/View/index.js";

  const cases: { name: string; source: string; expected: string }[] = [
    {
      name: "a sibling of the file",
      source: "./types",
      expected:
        "/project/node_modules/react-native-web/dist/exports/View/types",
    },
    {
      name: "a sibling of the file's directory",
      source: "../Text",
      expected: "/project/node_modules/react-native-web/dist/exports/Text",
    },
    {
      name: "the file's own directory",
      source: ".",
      expected: "/project/node_modules/react-native-web/dist/exports/View",
    },
    {
      name: "the parent of the file's directory",
      source: "..",
      expected: "/project/node_modules/react-native-web/dist/exports",
    },
    {
      name: "a climb that leaves the package's dist directory",
      source: "../../../View",
      expected: "/project/node_modules/react-native-web/View",
    },
  ];

  test.each(cases)("$name", ({ source, expected }) => {
    expect(withoutDrive(resolveImportSource(filename, source))).toBe(expected);
  });

  test("hands path.resolve's output to the host's normalization", () => {
    // Pins the composition: `resolve` over the file's directory, then
    // `toPosixPath` with the real `path.sep`. On POSIX the normalization is the
    // identity and this reduces to `resolve` — which is the one thing here that
    // cannot fail on ubuntu-latest, the only platform CI runs. The branch it
    // reduces away is held instead by the `toPosixPath` table above, which
    // supplies the separator and so needs no Windows host.
    const source = "../Text";

    expect(resolveImportSource(filename, source)).toBe(
      toPosixPath(resolve(dirname(filename), source), sep),
    );
  });
});

describe("findPackageRoot", () => {
  // Built into a temporary directory rather than asserted against this
  // repository, because the wrinkle under test only exists in the BUILT layout:
  // react-native-builder-bob writes a bare `{ "type": … }` package.json into
  // each output directory (`react-native-builder-bob/lib/src/utils/compile.js`),
  // and stopping at one of those names `<root>/dist/commonjs` as the package.
  // Running from source, the walk never meets one.
  let root = "";

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "react-native-css-root-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function write(relativePath: string, contents: string): void {
    const target = join(root, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }

  test("walks past a manifest that only declares a module type", () => {
    write("package.json", JSON.stringify({ name: "react-native-css" }));
    write("dist/commonjs/package.json", JSON.stringify({ type: "commonjs" }));
    mkdirSync(join(root, "dist", "commonjs", "babel"), { recursive: true });

    expect(findPackageRoot(join(root, "dist", "commonjs", "babel"))).toBe(root);
  });

  test("finds the root from the source layout too", () => {
    write("package.json", JSON.stringify({ name: "react-native-css" }));
    mkdirSync(join(root, "src", "babel"), { recursive: true });

    expect(findPackageRoot(join(root, "src", "babel"))).toBe(root);
  });

  test("stops at the nearest named manifest, not the outermost", () => {
    write("package.json", JSON.stringify({ name: "outer" }));
    write("packages/inner/package.json", JSON.stringify({ name: "inner" }));
    mkdirSync(join(root, "packages", "inner", "src"), { recursive: true });

    expect(findPackageRoot(join(root, "packages", "inner", "src"))).toBe(
      join(root, "packages", "inner"),
    );
  });
});
