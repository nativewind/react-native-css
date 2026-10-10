import { relative } from "path";

import type { CompilerWarnings } from "../compiler/compiler.types";

/** "summary" prints one capped block per CSS file, "verbose" lists every entry, "none" prints nothing */
export type WarningLevel = "none" | "summary" | "verbose";

const SUMMARY_ENTRY_LIMIT = 10;
const SUMMARY_VALUE_LIMIT = 5;
const SUMMARY_VALUE_LENGTH_LIMIT = 60;

const PREFIX = "react-native-css";

// Metro re-transforms a CSS file on every rebuild, so a file's block prints again only when its warnings change
const lastReportedByFile = new Map<string, string>();

// Metro forwards each transform worker's stderr to the bundler's terminal, and a warning never fails the build
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
    lastReportedByFile.delete(filename);
    return;
  }

  if (lastReportedByFile.get(filename) === message) {
    return;
  }

  lastReportedByFile.set(filename, message);

  console.warn(message);
}

// Plain text: Metro's transform workers write to a pipe, where colour would never render
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

  // A syntax warning sends the reader to their stylesheet rather than to what React Native lacks, so it is counted apart
  const syntaxCount = warnings.syntax?.length ?? 0;

  if (droppedCount === 0 && syntaxCount === 0) {
    return undefined;
  }

  const properties = limit(unique(warnings.properties), verbose);
  const functions = limit(unique(warnings.functions), verbose);
  const rendered = renderValues(warnings.values, verbose);
  const values = limit(rendered.entries, verbose);
  const syntax = limit(unique(warnings.syntax), verbose);

  const claims: string[] = [];
  if (droppedCount > 0) {
    claims.push(
      `${droppedCount} ${pluralize(droppedCount, "declaration")} dropped, no React Native equivalent`,
    );
  }
  if (syntaxCount > 0) {
    claims.push(
      `${syntaxCount} ${pluralize(syntaxCount, "rule")} could not be parsed`,
    );
  }

  const lines = [`${PREFIX}: ${displayPath} - ${claims.join("; ")}`];

  if (syntax.shown.length > 0) {
    lines.push(`  syntax: ${syntax.shown.join("; ")}${suffix(syntax.hidden)}`);
  }

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
    properties.hidden +
      values.hidden +
      functions.hidden +
      rendered.hidden +
      syntax.hidden >
    0
  ) {
    lines.push(
      `  Set reactNativeCSS.warnings to "verbose" for the full list, or "none" to silence this.`,
    );
  }

  return lines.join("\n");
}

function toDisplayPath(filename: string, projectRoot: string): string {
  const relativePath = relative(projectRoot, filename);

  return relativePath === "" || relativePath.startsWith("..")
    ? filename
    : relativePath;
}

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

// Code-unit order rather than localeCompare, whose collation varies with the ICU build
function unique(entries: string[] | undefined): string[] {
  return entries ? [...new Set(entries)].sort() : [];
}

function stringify(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || typeof value !== "object") {
    return String(value);
  }

  return JSON.stringify(value);
}

// An unresolved calc() is recorded as its whole lightningcss node, hundreds of characters long
function truncate(value: string, verbose: boolean): string {
  return verbose || value.length <= SUMMARY_VALUE_LENGTH_LIMIT
    ? value
    : `${value.slice(0, SUMMARY_VALUE_LENGTH_LIMIT)}...`;
}

function pluralize(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}
