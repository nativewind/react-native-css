import { Appearance, Dimensions } from "react-native";

import { inspect } from "node:util";

import { compile, type CompilerOptions } from "react-native-css/compiler";
import { StyleCollection } from "react-native-css/native";

import { colorScheme, dimensions } from "../native/reactivity";

declare global {
  /* eslint-disable @typescript-eslint/no-namespace */
  namespace jest {
    interface Matchers<R> {
      toHaveAnimatedStyle(style?: unknown): R;
    }
  }
}

export const testID = "react-native-css";

beforeEach(() => {
  StyleCollection.styles.clear();
  dimensions.set(Dimensions.get("window"));
  Appearance.setColorScheme(null);
  colorScheme.set(null);
});

const debugDefault = Boolean(
  process.env.REACT_NATIVE_CSS_TEST_DEBUG &&
    typeof process.env.NODE_OPTIONS === "string" &&
    process.env.NODE_OPTIONS.includes("--inspect"),
);

export function registerCSS(
  css: string,
  options: CompilerOptions & { debug?: boolean } = {},
) {
  const { debug = debugDefault } = options;
  const compiled = compileWithAutoDebug(css, options);

  if (debug) {
    console.log(
      `Compiled:\n---\n${inspect(
        {
          stylesheet: compiled.stylesheet(),
          warnings: compiled.warnings(),
        },
        { depth: null, colors: true, compact: false },
      )}`,
    );
  }

  StyleCollection.inject(compiled.stylesheet());

  return compiled;
}

// Wide enough that no test viewport matches it. Both declarations carry the
// same value, so the resolved value does not depend on that staying true.
const NEVER_MATCHES = "(min-width: 999999px)";

/**
 * Declares `:root` custom properties in a form that reaches the runtime
 * variable registry.
 *
 * `inlineVariables` (`src/compiler/inline-variables.ts`) inlines a custom
 * property that has exactly one **declaration**, so `:root { --my-var: red }`
 * compiles to a literal with no root variable entry at all. Use count does not
 * save it — one declaration read from ten rules is still inlined. A test
 * written that way asserts the inliner and passes with the runtime registry
 * deleted. A second declaration keeps the property dynamic, so `var()` stays a
 * descriptor the runtime has to resolve.
 *
 * Use this whenever a test's subject is the runtime, not the inliner:
 *
 * ```ts
 * registerCSS(`
 *   ${dynamicRootVariables({ "--my-var": "10px" })}
 *   .my-class { width: var(--my-var); }
 * `);
 * ```
 *
 * Real stylesheets usually reach this shape on their own — a `.dark` override
 * or a themed media query is a second declaration. Compiling with
 * `{ inlineVariables: false }` also works, but it turns the pass off for the
 * whole stylesheet and tests a configuration users do not run; prefer this.
 */
export function dynamicRootVariables(
  variables: Record<string, string | number>,
): string {
  const declarations = Object.entries(variables)
    .map(([name, value]) => {
      return `${name.startsWith("--") ? name : `--${name}`}: ${value};`;
    })
    .join(" ");

  return `:root { ${declarations} } @media ${NEVER_MATCHES} { :root { ${declarations} } }`;
}

export function compileWithAutoDebug(
  css: string,
  {
    debug = debugDefault,
    ...options
  }: CompilerOptions & { debug?: boolean | "verbose" } = {},
) {
  const logger = debug
    ? (text: string) => {
        // Just log the rules
        if (text.startsWith("[") && debug === "verbose") {
          console.log(`Rules:\n---\n${text}`);
        }
      }
    : undefined;

  return compile(css, { ...options, logger });
}
