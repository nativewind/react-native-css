import { basename, dirname, resolve, sep } from "node:path";

// Anchored on the layout segment, since this runs from src/babel under the source condition and from dist/<format>/babel once built
const packageRoot = resolve(
  __dirname,
  basename(dirname(__dirname)) === "src" ? "../.." : "../../..",
);
const thisModuleDist = resolve(packageRoot, "dist") + sep;
const thisModuleSrc = resolve(packageRoot, "src") + sep;

/** Whether `filename` is one of this package's own modules, which import the libraries it rewrites */
export function isFromThisModule(filename: string): boolean {
  return (
    filename.startsWith(thisModuleDist) || filename.startsWith(thisModuleSrc)
  );
}
