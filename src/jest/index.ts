/* eslint-disable @typescript-eslint/no-namespace */
import { Dimensions } from "react-native";

import { compile, type CompilerOptions } from "../compiler";
import { StyleCollection } from "../runtime/native/injection";
import { colorScheme, dimensions, rem } from "../runtime/native/reactivity";

declare global {
  namespace jest {
    interface Matchers<R> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toHaveAnimatedStyle(style?: any): R;
    }
  }
}

export * from "@testing-library/react-native";
export const testID = "react-native-css";

beforeEach(() => {
  StyleCollection.styles.clear();
  dimensions.set(Dimensions.get("window"));
  rem.set(14);
  colorScheme.set(null);
});

export function registerCSS(
  css: string,
  {
    debugCompiled = process.env.NODE_OPTIONS?.includes("--inspect"),
    ...options
  }: CompilerOptions & { debugCompiled?: boolean } = {},
) {
  const compiled = compile(css, options);
  if (debugCompiled) {
    console.log(`Compiled styles:\n\n${JSON.stringify({ compiled }, null, 2)}`);
  }

  StyleCollection.inject(compiled);

  return compiled;
}
