import { Dimensions } from "react-native";

import { compile, CompilerOptions } from "../compiler";
import {
  dimensions,
  rem,
  styleFamily,
  systemColorScheme,
} from "../runtime/native/globals";
import { injectData } from "../runtime/native/stylesheet";

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveStyle(style?: any | any[]): R;
      toHaveAnimatedStyle(style?: any): R;
    }
  }
}

export * from "@testing-library/react-native";
export const testID = "react-native-css";

beforeEach(() => {
  styleFamily.clear();
  systemColorScheme.set(undefined);
  dimensions.set(Dimensions.get("window"));
  rem.set(14);
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

  injectData(compiled);
}

export function setupAllComponents() {
  require("../runtime/components");
}
