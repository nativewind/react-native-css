import { resolvePosix } from "../../babel/helpers";

describe("resolvePosix", () => {
  test("resolves to an absolute path with POSIX separators on every platform", () => {
    // The invariant the import handlers depend on: no backslashes leak through,
    // so their forward-slash `split` / `startsWith` matching works on Windows
    // (where path.resolve otherwise yields "\"-separated paths).
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
