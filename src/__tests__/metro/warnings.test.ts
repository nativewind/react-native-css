import { join } from "path";

import { compile } from "../../compiler";
import {
  formatCompilerWarnings,
  reportCompilerWarnings,
} from "../../metro/warnings";

/**
 * Every fixture below is a real `compile()` result rather than a hand-written
 * `CompilerWarnings` literal. A literal would agree with whatever the compiler
 * happens to do — including with the compiler no longer warning at all, which
 * is the failure this feature exists to make visible.
 *
 * The one literal in the file is the `functions` channel, and it says why.
 */
function warningsFor(css: string) {
  return compile(css).warnings();
}

const PROJECT_ROOT = join("/project");

const FIFTEEN_UNSUPPORTED_PROPERTIES = `.a {
  mix-blend-mode: multiply;
  background-blend-mode: screen;
  touch-action: none;
  transform-origin: top left;
  font-variant-numeric: ordinal;
  border-spacing: 2px;
  background-position: center;
  backdrop-filter: blur(2px);
  break-before: page;
  break-after: page;
  white-space: nowrap;
  resize: both;
  will-change: transform;
  clear: both;
  order: 2;
}`;

const SEVEN_UNSUPPORTED_BORDER_STYLES = `.a { border-style: hidden; }
.b { border-style: double; }
.c { border-style: groove; }
.d { border-style: ridge; }
.e { border-style: inset; }
.f { border-style: outset; }
.g { border-style: none; }`;

const written: string[] = [];

beforeEach(() => {
  written.length = 0;
  jest.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    written.push(args.map((arg) => String(arg)).join(" "));
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * Metro's own dependencies write to `console.warn` during a transform
 * (browserslist announces its age, for one), so the assertion is over this
 * package's lines rather than over every line.
 */
function reported(): string[] {
  return written.filter((message) => message.startsWith("react-native-css:"));
}

describe("formatCompilerWarnings", () => {
  test("names the file, the count and the dropped property", () => {
    expect(
      formatCompilerWarnings(warningsFor(`.a { float: left; }`), {
        displayPath: "src/global.css",
      }),
    ).toBe(
      [
        "react-native-css: src/global.css - 1 declaration dropped, no React Native equivalent",
        "  properties: float",
      ].join("\n"),
    );
  });

  test("a compile that dropped nothing formats to nothing", () => {
    expect(
      formatCompilerWarnings(warningsFor(`.a { color: red; }`), {
        displayPath: "src/global.css",
      }),
    ).toBeUndefined();
  });

  test("a repeated property is listed once and counted every time", () => {
    expect(
      formatCompilerWarnings(
        warningsFor(
          `.a { float: left; } .b { float: right; } .c { float: none; }`,
        ),
        { displayPath: "src/global.css" },
      ),
    ).toBe(
      [
        "react-native-css: src/global.css - 3 declarations dropped, no React Native equivalent",
        "  properties: float",
      ].join("\n"),
    );
  });

  test("both channels are reported together", () => {
    expect(
      formatCompilerWarnings(
        warningsFor(`.a { float: left; z-index: auto; }`),
        {
          displayPath: "src/global.css",
        },
      ),
    ).toBe(
      [
        "react-native-css: src/global.css - 2 declarations dropped, no React Native equivalent",
        "  properties: float",
        "  values: z-index: auto",
      ].join("\n"),
    );
  });

  test("a value the compiler recorded as a number renders as text", () => {
    // `line-height: 50%` is the live producer of a non-string entry: it reaches
    // `addWarning("style", "line-height", 0.5)`. That is why the channel is
    // typed `unknown[]`, and why rendering it is total rather than a cast.
    expect(
      formatCompilerWarnings(warningsFor(`.a { line-height: 50%; }`), {
        displayPath: "src/global.css",
      }),
    ).toBe(
      [
        "react-native-css: src/global.css - 1 declaration dropped, no React Native equivalent",
        "  values: line-height: 0.5",
      ].join("\n"),
    );
  });

  test("a value too long for a line is cut short, and verbose keeps it whole", () => {
    // An unresolved `calc()` reaches the channel as a serialized lightningcss
    // node — the longest value any real stylesheet produces.
    const warnings = warningsFor(`.a { line-height: calc(1px + 2%); }`);

    expect(
      formatCompilerWarnings(warnings, { displayPath: "src/global.css" }),
    ).toBe(
      [
        "react-native-css: src/global.css - 1 declaration dropped, no React Native equivalent",
        `  values: line-height: {"type":"function","value":{"type":"calc","value":{"type":"s...`,
      ].join("\n"),
    );

    expect(
      formatCompilerWarnings(warnings, {
        displayPath: "src/global.css",
        verbose: true,
      }),
    ).toContain(`"unit":"px"`);
  });

  test("the functions channel is rendered when it carries anything", () => {
    // A literal, deliberately. `getWarnings()` declares this channel and
    // `compile()` returns it, but no `addWarning` call site writes to it today,
    // so no CSS can produce one. A formatter that quietly ignored it would make
    // the first producer as unreachable as the whole channel is today.
    expect(
      formatCompilerWarnings(
        { functions: ["env()", "attr()", "env()"] },
        { displayPath: "src/global.css" },
      ),
    ).toBe(
      [
        "react-native-css: src/global.css - 3 declarations dropped, no React Native equivalent",
        "  functions: attr(), env()",
      ].join("\n"),
    );
  });

  test("a summary sorts, caps at ten and says how to see the rest", () => {
    expect(
      formatCompilerWarnings(warningsFor(FIFTEEN_UNSUPPORTED_PROPERTIES), {
        displayPath: "src/global.css",
      }),
    ).toBe(
      [
        "react-native-css: src/global.css - 15 declarations dropped, no React Native equivalent",
        "  properties: backdrop-filter, background-blend-mode, background-position, border-spacing, break-after, break-before, clear, font-variant-numeric, mix-blend-mode, order (+5 more)",
        `  Set reactNativeCSS.warnings to "verbose" for the full list, or "none" to silence this.`,
      ].join("\n"),
    );
  });

  test("verbose lists every entry and drops the hint", () => {
    expect(
      formatCompilerWarnings(warningsFor(FIFTEEN_UNSUPPORTED_PROPERTIES), {
        displayPath: "src/global.css",
        verbose: true,
      }),
    ).toBe(
      [
        "react-native-css: src/global.css - 15 declarations dropped, no React Native equivalent",
        "  properties: backdrop-filter, background-blend-mode, background-position, border-spacing, break-after, break-before, clear, font-variant-numeric, mix-blend-mode, order, resize, touch-action, transform-origin, white-space, will-change",
      ].join("\n"),
    );
  });

  test("one property's values cap at five so it cannot crowd out the rest", () => {
    expect(
      formatCompilerWarnings(warningsFor(SEVEN_UNSUPPORTED_BORDER_STYLES), {
        displayPath: "src/global.css",
      }),
    ).toBe(
      [
        "react-native-css: src/global.css - 7 declarations dropped, no React Native equivalent",
        "  values: border-style: double, groove, hidden, inset, none (+2 more)",
        `  Set reactNativeCSS.warnings to "verbose" for the full list, or "none" to silence this.`,
      ].join("\n"),
    );
  });

  test("verbose lists every value of a property too", () => {
    expect(
      formatCompilerWarnings(warningsFor(SEVEN_UNSUPPORTED_BORDER_STYLES), {
        displayPath: "src/global.css",
        verbose: true,
      }),
    ).toBe(
      [
        "react-native-css: src/global.css - 7 declarations dropped, no React Native equivalent",
        "  values: border-style: double, groove, hidden, inset, none, outset, ridge",
      ].join("\n"),
    );
  });
});

describe("reportCompilerWarnings", () => {
  test("writes the block to console.warn, pathed from the project root", () => {
    reportCompilerWarnings(warningsFor(`.a { float: left; }`), {
      filename: join(PROJECT_ROOT, "src", "reports.css"),
      projectRoot: PROJECT_ROOT,
    });

    expect(reported()).toStrictEqual([
      [
        `react-native-css: ${join("src", "reports.css")} - 1 declaration dropped, no React Native equivalent`,
        "  properties: float",
      ].join("\n"),
    ]);
  });

  test('"none" writes nothing at all', () => {
    reportCompilerWarnings(warningsFor(`.a { float: left; }`), {
      filename: join(PROJECT_ROOT, "src", "silenced.css"),
      projectRoot: PROJECT_ROOT,
      level: "none",
    });

    expect(reported()).toStrictEqual([]);
  });

  test('"verbose" writes the uncapped block', () => {
    reportCompilerWarnings(warningsFor(SEVEN_UNSUPPORTED_BORDER_STYLES), {
      filename: join(PROJECT_ROOT, "src", "verbose.css"),
      projectRoot: PROJECT_ROOT,
      level: "verbose",
    });

    expect(reported()[0]).toContain(
      "values: border-style: double, groove, hidden, inset, none, outset, ridge",
    );
  });

  test("a file whose warnings have not changed is not reported twice", () => {
    const filename = join(PROJECT_ROOT, "src", "unchanged.css");

    for (let index = 0; index < 3; index += 1) {
      reportCompilerWarnings(warningsFor(`.a { float: left; }`), {
        filename,
        projectRoot: PROJECT_ROOT,
      });
    }

    expect(reported()).toHaveLength(1);
  });

  test("a file whose warnings changed is reported again", () => {
    const filename = join(PROJECT_ROOT, "src", "changed.css");

    reportCompilerWarnings(warningsFor(`.a { float: left; }`), {
      filename,
      projectRoot: PROJECT_ROOT,
    });
    reportCompilerWarnings(warningsFor(`.a { float: left; z-index: auto; }`), {
      filename,
      projectRoot: PROJECT_ROOT,
    });

    const calls = reported();
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain("values: z-index: auto");
  });

  test("a file that stops warning can warn again later", () => {
    const filename = join(PROJECT_ROOT, "src", "fixed-then-broken.css");

    reportCompilerWarnings(warningsFor(`.a { float: left; }`), {
      filename,
      projectRoot: PROJECT_ROOT,
    });
    reportCompilerWarnings(warningsFor(`.a { color: red; }`), {
      filename,
      projectRoot: PROJECT_ROOT,
    });
    reportCompilerWarnings(warningsFor(`.a { float: left; }`), {
      filename,
      projectRoot: PROJECT_ROOT,
    });

    expect(reported()).toHaveLength(2);
  });

  test("each file reports on its own, not once per process", () => {
    for (const name of ["first.css", "second.css"]) {
      reportCompilerWarnings(warningsFor(`.a { float: left; }`), {
        filename: join(PROJECT_ROOT, "src", name),
        projectRoot: PROJECT_ROOT,
      });
    }

    expect(reported()).toHaveLength(2);
  });

  test("a file outside the project root keeps its absolute path", () => {
    const filename = join("/elsewhere", "vendor", "theme.css");

    reportCompilerWarnings(warningsFor(`.a { float: left; }`), {
      filename,
      projectRoot: PROJECT_ROOT,
    });

    expect(reported()[0]).toContain(`react-native-css: ${filename} -`);
  });
});

/**
 * The syntax channel — a diagnostic lightningcss produced and this compiler
 * discarded.
 *
 * lightningcss has two classes of malformed input. One THROWS, and a throw is
 * already loud. The other is recovered and reported through `result.warnings`
 * with no `errorRecovery` flag needed, and that return value was dropped at
 * both call sites in `compiler.ts` — so an ordinary typo silently deleted a
 * rule while the feature whose whole subject is surfacing compiler warnings
 * said nothing.
 *
 * Note where the rule is lost. lightningcss passes the malformed sheet through
 * verbatim; it is this package's own visitor that finds nothing to extract.
 * So lightningcss's warning is the only signal that anything went wrong.
 */
describe("the syntax channel", () => {
  test("an unknown at-rule swallows a rule and now says so", () => {
    // `.b` is inside the unknown at-rule and does not survive. The control
    // below is what makes that a finding rather than an assumption.
    const compiled = compile(
      `@unknown-thing { .b { color: blue } }\n.c { color: green }`,
    );

    expect(compiled.stylesheet().s?.map(([name]) => name)).toStrictEqual(["c"]);
    expect(compiled.warnings().syntax).toStrictEqual([
      "Unknown at rule: @unknown-thing",
    ]);
  });

  test("an unrecognised pseudo-element does the same", () => {
    const compiled = compile(`.a::wat { color: red }\n.c { color: green }`);

    expect(compiled.stylesheet().s?.map(([name]) => name)).toStrictEqual(["c"]);
    expect(compiled.warnings().syntax?.length).toBeGreaterThan(0);
  });

  test("CONTROL — the same shape, spelled correctly, keeps both rules and warns nothing", () => {
    // Without this the two tests above would pass against a compiler that had
    // simply stopped emitting `.b`, which is the opposite of the fix.
    const compiled = compile(
      `@media (min-width: 1px) { .b { color: blue } }\n.c { color: green }`,
    );

    expect(compiled.stylesheet().s?.map(([name]) => name)).toStrictEqual([
      "b",
      "c",
    ]);
    expect(compiled.warnings().syntax).toBeUndefined();
  });

  test("CONTROL — this package's OWN at-rules are not reported as unknown", () => {
    // `@react-native` and `@nativeMapping` are the two at-rules `atRules.ts`
    // defines, and lightningcss calls both unknown because they are ours. A
    // channel that reported them would fire on every stylesheet this compiler
    // is designed to read.
    expect(compile(`@react-native { }`).warnings().syntax).toBeUndefined();
  });

  test("the same mistake made twice is reported once, two distinct ones twice", () => {
    // Measured: lightningcss emits one warning per occurrence and the message
    // carries no line or column, so a repeat is a second copy of a string the
    // reader cannot tell apart from the first. Collapsing them is what keeps
    // the channel readable — and the second assertion is what stops that
    // collapse from swallowing a genuinely different diagnostic.
    expect(
      warningsFor(
        `@unknown-a { .x { color: red } }
@unknown-a { .y { color: blue } }`,
      ).syntax,
    ).toStrictEqual(["Unknown at rule: @unknown-a"]);

    expect(
      warningsFor(
        `@unknown-a { .x { color: red } }
@unknown-b { .y { color: blue } }`,
      ).syntax,
    ).toStrictEqual([
      "Unknown at rule: @unknown-a",
      "Unknown at rule: @unknown-b",
    ]);
  });
});
