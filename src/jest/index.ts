import { Appearance, Dimensions } from "react-native";

import { inspect } from "node:util";

import {
  compile,
  type CompilerOptions,
  type ReactNativeCssStyleSheet,
} from "react-native-css/compiler";
import { StyleCollection } from "react-native-css/native";

import { serializeStyleSheet } from "../metro/injection-code";
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

  StyleCollection.inject(injectableStyleSheet(compiled.stylesheet()));

  return compiled;
}

/**
 * A stylesheet in the shape a device receives.
 *
 * Metro writes the stylesheet into the bundle as JSON source text and the
 * bundler's parser reads it back; `JSON.parse` stands in for that parser. A test
 * that injected the compiler's own object would be asserting against values -
 * `undefined` in particular - that no device can hold.
 */
function injectableStyleSheet(
  stylesheet: ReactNativeCssStyleSheet,
): ReactNativeCssStyleSheet {
  return JSON.parse(
    serializeStyleSheet(stylesheet),
  ) as ReactNativeCssStyleSheet;
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
