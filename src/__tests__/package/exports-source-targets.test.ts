/**
 * @jest-environment node
 */
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import packageJson from "../../../package.json";

const PACKAGE_ROOT = resolve(__dirname, "..", "..", "..");
const COMPONENTS_DIRECTORY = join(PACKAGE_ROOT, "src", "components");

type ExportsEntry = string | { readonly [condition: string]: ExportsEntry };

const EXPORTS_MAP = packageJson.exports as Readonly<
  Record<string, ExportsEntry>
>;

/** Only these two conditions name a path inside `src/`; every other one names a build artifact. */
const SOURCE_CONDITIONS = ["source", "react-native"] as const;

const sourceTargetsOf = (entry: ExportsEntry): readonly string[] => {
  if (typeof entry === "string") return [];
  return SOURCE_CONDITIONS.flatMap((condition) => {
    const value = entry[condition];
    return typeof value === "string" ? [value] : [];
  });
};

const substituteWildcard = (
  entry: ExportsEntry,
  wildcard: string,
): ExportsEntry => {
  if (typeof entry === "string") return entry.replace("*", wildcard);
  return Object.fromEntries(
    Object.entries(entry).map(([condition, value]) => [
      condition,
      substituteWildcard(value, wildcard),
    ]),
  );
};

/** Node prefers an exact key, then the pattern whose literal prefix before `*` is longest. */
const resolveSubpath = (subpath: string): ExportsEntry | undefined => {
  const exact = EXPORTS_MAP[subpath];
  if (exact !== undefined) return exact;

  let longestPrefix = -1;
  let matched: ExportsEntry | undefined;
  for (const [key, entry] of Object.entries(EXPORTS_MAP)) {
    const star = key.indexOf("*");
    if (star === -1) continue;
    const prefix = key.slice(0, star);
    const suffix = key.slice(star + 1);
    if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) continue;
    if (subpath.length < prefix.length + suffix.length) continue;
    if (prefix.length <= longestPrefix) continue;
    longestPrefix = prefix.length;
    matched = substituteWildcard(
      entry,
      subpath.slice(prefix.length, subpath.length - suffix.length),
    );
  }
  return matched;
};

const existenceOf = (
  subpath: string,
  targets: readonly string[],
): readonly {
  readonly subpath: string;
  readonly target: string;
  readonly exists: boolean;
}[] =>
  targets.map((target) => ({
    subpath,
    target,
    exists: existsSync(join(PACKAGE_ROOT, target)),
  }));

const allExist = (
  subpath: string,
  targets: readonly string[],
): readonly {
  readonly subpath: string;
  readonly target: string;
  readonly exists: boolean;
}[] => targets.map((target) => ({ subpath, target, exists: true }));

const literalEntries = Object.entries(EXPORTS_MAP).filter(
  ([key]) => !key.includes("*"),
);

/** A consumer imports `./components/<name>`, so two modules differing only by extension are one import. */
const componentSubpaths = [
  ...new Set(
    readdirSync(COMPONENTS_DIRECTORY).map(
      (file) => `./components/${file.replace(/\.[^.]+$/u, "")}`,
    ),
  ),
].sort();

describe("exports source targets", () => {
  it("has subpaths and component modules to check", () => {
    expect(literalEntries.length).toBeGreaterThan(0);
    expect(componentSubpaths.length).toBeGreaterThan(0);
  });

  it.each(literalEntries)(
    "%s names source files that exist",
    (subpath, entry) => {
      const targets = sourceTargetsOf(entry);
      expect(existenceOf(subpath, targets)).toStrictEqual(
        allExist(subpath, targets),
      );
    },
  );

  it.each(componentSubpaths)(
    "%s resolves to a source file that exists",
    (subpath) => {
      const entry = resolveSubpath(subpath);
      if (entry === undefined)
        throw new Error(`${subpath} resolves through no exports entry`);

      const targets = sourceTargetsOf(entry);
      expect(targets.length).toBeGreaterThan(0);
      expect(existenceOf(subpath, targets)).toStrictEqual(
        allExist(subpath, targets),
      );
    },
  );
});
