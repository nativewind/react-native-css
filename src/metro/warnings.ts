import { relative } from "path";

import type { CompilerWarnings } from "../compiler/compiler.types";

/**
 * How a Metro build surfaces the compiler's advisory warnings.
 *
 * - `summary` (the default) prints one deduplicated, capped block per CSS file.
 * - `verbose` prints the same block with every entry listed.
 * - `none` prints nothing.
 */
export type WarningLevel = "none" | "summary" | "verbose";

/**
 * The number of distinct entries a `summary` block lists per channel before it
 * collapses the rest into a `(+N more)` count.
 *
 * Ten is a measured figure rather than a round one. Compiling the Tailwind
 * corpus in `src/__tests__/vendor/tailwind` warns on 87 distinct properties, so
 * an uncapped block would be a screen of output on the most common setup this
 * package has; ten fits a terminal line and still names the properties a reader
 * is most likely to recognise.
 */
const SUMMARY_ENTRY_LIMIT = 10;

/**
 * The number of distinct values a `summary` block lists for a single property.
 *
 * Separate from the entry limit because the two truncate different things: a
 * property with six unusable values is one line, not six.
 */
const SUMMARY_VALUE_LIMIT = 5;

/** The characters a `summary` block prints of any single value. */
const SUMMARY_VALUE_LENGTH_LIMIT = 60;

const PREFIX = "react-native-css";

/**
 * The last message emitted for a file, keyed by its absolute path.
 *
 * This is the noise model, and it is deliberately not "print everything".
 *
 * Metro transforms a file whenever its contents change, and a Tailwind build
 * rewrites its CSS output on nearly every source save — so a transformer that
 * printed unconditionally would reprint an identical block on every keystroke
 * for the whole session. Keying on the message means a block prints when the
 * set of warnings for a file CHANGES, which is the only moment a reader learns
 * something: the first compile, and every time a fix removes an entry or a new
 * declaration adds one.
 *
 * The map is bounded by the number of CSS files in the project rather than by
 * the number of transforms, and it lives per worker process, so a restarted
 * bundler reprints. Nothing here decides correctness — a dropped entry costs a
 * repeated line, never a wrong build.
 */
const lastReportedByFile = new Map<string, string>();

/**
 * Surface a compile's warnings on the terminal running the bundler.
 *
 * Writes through `console.warn`, which is what makes it reachable: Metro pipes
 * each transform worker's stderr to the parent and its reporter prints the
 * chunk (`WorkerFarm` forwards it as `worker_stderr_chunk`; `TerminalReporter`
 * logs it). With `maxWorkers: 1` the worker is required in-band and the write
 * lands on the bundler's own stderr. Neither path fails the build — these are
 * advisory, and a dropped `float` is not a reason to refuse to bundle.
 */
export function reportCompilerWarnings(
  warnings: CompilerWarnings,
  options: {
    filename: string;
    projectRoot: string;
    level?: WarningLevel | undefined;
  },
): void {
  const { filename, projectRoot, level = "summary" } = options;

  if (level === "none") {
    return;
  }

  const message = formatCompilerWarnings(warnings, {
    displayPath: toDisplayPath(filename, projectRoot),
    verbose: level === "verbose",
  });

  if (message === undefined) {
    // A file that stops warning must be able to warn again later, so the
    // absence is recorded by forgetting it rather than by storing an empty
    // message.
    lastReportedByFile.delete(filename);
    return;
  }

  if (lastReportedByFile.get(filename) === message) {
    return;
  }

  lastReportedByFile.set(filename, message);

  console.warn(message);
}

/**
 * Render a compile's warnings as a single block, or `undefined` when the
 * compile recorded none.
 *
 * The block is plain text with no ANSI escapes. Metro runs transformers in
 * `jest-worker` children whose stdio is piped, so `process.stdout.isTTY` is
 * unset there and the vendored `picocolors` would disable itself anyway —
 * colour would appear only in the `maxWorkers: 1` in-band case, which is a
 * worse outcome than never colouring at all.
 */
export function formatCompilerWarnings(
  warnings: CompilerWarnings,
  options: { displayPath: string; verbose?: boolean | undefined },
): string | undefined {
  const { displayPath, verbose = false } = options;

  const droppedCount =
    (warnings.properties?.length ?? 0) +
    (warnings.functions?.length ?? 0) +
    Object.values(warnings.values ?? {}).reduce(
      (total, entries) => total + entries.length,
      0,
    );

  if (droppedCount === 0) {
    return undefined;
  }

  const properties = limit(unique(warnings.properties), verbose);
  const functions = limit(unique(warnings.functions), verbose);
  const rendered = renderValues(warnings.values, verbose);
  const values = limit(rendered.entries, verbose);

  const lines = [
    `${PREFIX}: ${displayPath} - ${droppedCount} ${pluralize(droppedCount, "declaration")} dropped, no React Native equivalent`,
  ];

  if (properties.shown.length > 0) {
    lines.push(
      `  properties: ${properties.shown.join(", ")}${suffix(properties.hidden)}`,
    );
  }

  if (values.shown.length > 0) {
    lines.push(`  values: ${values.shown.join("; ")}${suffix(values.hidden)}`);
  }

  if (functions.shown.length > 0) {
    lines.push(
      `  functions: ${functions.shown.join(", ")}${suffix(functions.hidden)}`,
    );
  }

  if (
    properties.hidden + values.hidden + functions.hidden + rendered.hidden >
    0
  ) {
    lines.push(
      `  Set reactNativeCSS.warnings to "verbose" for the full list, or "none" to silence this.`,
    );
  }

  return lines.join("\n");
}

/**
 * The path a reader recognises: relative to the project root when the file is
 * inside it, absolute when it is not.
 *
 * Separators are the host's. A Windows developer reads a Windows path, and
 * every assertion over this value can build its expectation with `path.join`
 * rather than hardcoding one host's shape.
 */
function toDisplayPath(filename: string, projectRoot: string): string {
  const relativePath = relative(projectRoot, filename);

  return relativePath === "" || relativePath.startsWith("..")
    ? filename
    : relativePath;
}

/**
 * One entry per property that carried an unusable value, each listing that
 * property's distinct values.
 *
 * Grouped rather than flattened because the two truncate differently: a
 * property with six unusable values is one line worth reading, not six lines
 * that push five other properties out of the block.
 */
function renderValues(
  values: Record<string, unknown[]> | undefined,
  verbose: boolean,
): { entries: string[]; hidden: number } {
  let hidden = 0;
  const entries: string[] = [];

  for (const [property, recorded] of Object.entries(values ?? {}).sort(
    ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0),
  )) {
    const distinct = unique(recorded.map(stringify));

    if (distinct.length === 0) {
      continue;
    }

    const shown = verbose ? distinct : distinct.slice(0, SUMMARY_VALUE_LIMIT);
    hidden += distinct.length - shown.length;

    const rendered = shown.map((value) => truncate(value, verbose));

    entries.push(
      `${property}: ${rendered.join(", ")}${suffix(distinct.length - shown.length)}`,
    );
  }

  return { entries, hidden };
}

function limit<T>(entries: T[], verbose: boolean) {
  if (verbose || entries.length <= SUMMARY_ENTRY_LIMIT) {
    return { shown: entries, hidden: 0 };
  }

  return {
    shown: entries.slice(0, SUMMARY_ENTRY_LIMIT),
    hidden: entries.length - SUMMARY_ENTRY_LIMIT,
  };
}

function suffix(hidden: number): string {
  return hidden > 0 ? ` (+${hidden} more)` : "";
}

/**
 * Distinct entries in code-unit order.
 *
 * Not `localeCompare`: the order of this list is asserted by tests that run on
 * three operating systems, and collation is an ICU-and-locale decision. Code
 * units are the same everywhere, and for CSS identifiers they read the same as
 * alphabetical.
 */
function unique(entries: string[] | undefined): string[] {
  return entries ? [...new Set(entries)].sort() : [];
}

/**
 * `values` is `Record<string, unknown[]>` because the compiler records whatever
 * it could not translate: a string for most declarations, a number for
 * `line-height`, and a serialized lightningcss node for an unresolved `calc()`.
 * Rendering is therefore total rather than a cast.
 */
function stringify(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || typeof value !== "object") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    // A warning must never be the thing that fails a build, and
    // `JSON.stringify` throws on a circular value.
    return "[unserializable]";
  }
}

/**
 * Keep one value from taking a whole terminal line.
 *
 * An unresolved `calc()` is recorded as its serialized lightningcss node, which
 * runs to a few hundred characters — long enough to bury the other entries in
 * the block it appears in. `verbose` prints it whole.
 */
function truncate(value: string, verbose: boolean): string {
  return verbose || value.length <= SUMMARY_VALUE_LENGTH_LIMIT
    ? value
    : `${value.slice(0, SUMMARY_VALUE_LENGTH_LIMIT)}...`;
}

function pluralize(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}
