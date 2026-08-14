import { resolvePosix, toPosixPath } from "../../babel/helpers";

// toPosixPath is asserted against Windows-shaped literals rather than through
// path.resolve, so it fails on every host when the normalization is removed.
// Driving it through resolve() instead would make it inert on Linux — where
// resolve() never emits a backslash — which is the only platform CI runs.
//
// resolvePosix's platform gate is not directly observable: on POSIX its effect is
// to leave the path alone, which is also what would happen without it. What is
// pinned below is the contract either way — the result carries no separator the
// import handlers cannot match, and the segments survive.
describe("toPosixPath", () => {
  test("converts a Windows path to POSIX separators", () => {
    expect(
      toPosixPath(
        "C:\\project\\node_modules\\react-native\\Libraries\\Components\\View\\View",
      ),
    ).toBe(
      "C:/project/node_modules/react-native/Libraries/Components/View/View",
    );
  });

  test("makes the marker the import handlers split on findable", () => {
    // The defect itself: the resolved path plainly contains those directories,
    // and the forward-slash marker is absent from it until this runs
    const resolved =
      "C:\\project\\node_modules\\react-native\\Libraries\\Components\\View\\View";
    const marker = "react-native/Libraries/Components/";

    expect(resolved).not.toContain(marker);
    expect(toPosixPath(resolved)).toContain(marker);
    expect(toPosixPath(resolved).split(marker)[1]).toBe("View/View");
  });

  test("leaves an already-POSIX path untouched", () => {
    const posix = "/project/node_modules/react-native-web/dist/exports/View";

    expect(toPosixPath(posix)).toBe(posix);
  });

  test("converts every separator, not just the first", () => {
    expect(toPosixPath("a\\b\\c\\d")).toBe("a/b/c/d");
  });
});

describe("resolvePosix", () => {
  test("resolves to an absolute path carrying no backslash", () => {
    const result = resolvePosix(process.cwd(), "a", "b", "c");

    expect(result).not.toContain("\\");
    expect(result.split("/").slice(-3)).toEqual(["a", "b", "c"]);
  });

  test("collapses '..' segments like path.resolve, keeping POSIX separators", () => {
    const result = resolvePosix(process.cwd(), "a", "b", "..", "c");

    expect(result).not.toContain("\\");
    expect(result.split("/").slice(-2)).toEqual(["a", "c"]);
  });
});
