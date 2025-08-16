import { Appearance, Dimensions } from "react-native";

import { inspect } from "node:util";

import { compile, type CompilerOptions } from "../compiler";
import { StyleCollection } from "../runtime/native/injection";
import { colorScheme, dimensions, rem } from "../runtime/native/reactivity";

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
  rem.set(14);
  Appearance.setColorScheme(null);
  colorScheme.set(null);
});

const debugDefault = Boolean(
  process.env.REACT_NATIVE_CSS_TEST_DEBUG &&
    process.env.NODE_OPTIONS?.includes("--inspect"),
);

export function registerCSS(
  css: string,
  options: CompilerOptions & { debug?: boolean } = {},
) {
  const { debug } = options;
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
  }: CompilerOptions & { debug?: boolean } = {},
) {
  const logger = debug
    ? (text: string) => {
        // Just log the rules
        if (text.startsWith("[")) {
          console.log(`Rules:\n---\n${text}`);
        }
      }
    : undefined;

  return compile(css, { ...options, logger });
}
