import { Appearance, Dimensions } from "react-native";

import { inspect } from "node:util";

import { compile, type CompilerOptions } from "react-native-css/compiler";
import {
  colorScheme,
  reducedMotion,
  StyleCollection,
} from "react-native-css/native";
import {
  deviceReducedMotion,
  dimensions,
} from "react-native-css/native-internal";

declare global {
  /* eslint-disable @typescript-eslint/no-namespace */
  namespace jest {
    interface Matchers<R> {
      toHaveAnimatedStyle(style?: unknown): R;
    }
  }
}

export const testID = "react-native-css";

// A test may fire React Native's reduceMotionChanged, so each test starts from the answer the file's first test began with
let deviceReducedMotionAtStart:
  | { readonly answer: ReturnType<typeof deviceReducedMotion.get> }
  | undefined;

// The components a consumer's suite renders read the package's own build, so the reset reaches them through the package's entry
beforeEach(() => {
  StyleCollection.styles.clear();
  dimensions.set(Dimensions.get("window"));
  Appearance.setColorScheme("unspecified");
  colorScheme.set(null);
  deviceReducedMotionAtStart ??= { answer: deviceReducedMotion.get() };
  deviceReducedMotion.set(deviceReducedMotionAtStart.answer);
  reducedMotion.set(null);
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
