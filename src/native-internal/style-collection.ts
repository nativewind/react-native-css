import { type Context } from "react";

import type {
  Animation,
  ReactNativeCssStyleSheet,
  StyleRuleSet,
} from "react-native-css/compiler";

import { DEFAULT_CONTAINER_NAME } from "../native/conditions/container-query";
import {
  family,
  observable,
  observableBatch,
  type Observable,
  type VariableContextValue,
} from "../native/reactivity";
import { rootVariables, universalVariables } from "./root";

export { rootVariables, universalVariables };

interface StyleCollectionType {
  styles: ReturnType<typeof family<string, Observable<StyleRuleSet>>>;
  keyframes: ReturnType<typeof family<string, Observable<Animation[1]>>>;
  inject: (options: ReactNativeCssStyleSheet) => void;
}

declare global {
  var __react_native_css_style_collection: StyleCollectionType | undefined;
  var __react_native_css_variable_context:
    | Context<VariableContextValue>
    | undefined;
}

globalThis.__react_native_css_style_collection ??= {
  styles: family<string, Observable<StyleRuleSet>>(() => {
    return observable([], isDeepEqual);
  }),
  keyframes: family<string, Observable<Animation[1]>>(() => {
    return observable([], isDeepEqual);
  }),
  inject: function (options: ReactNativeCssStyleSheet) {
    observableBatch.current = new Set();

    StyleCollection.styles("will-change-variable").set([
      {
        s: [0],
        v: [],
      },
    ]);

    StyleCollection.styles("will-change-container").set([
      {
        s: [0],
        c: [DEFAULT_CONTAINER_NAME],
      },
    ]);

    StyleCollection.styles("will-change-animation").set([
      {
        s: [0],
        a: true,
      },
    ]);

    StyleCollection.styles("will-change-pressable").set([
      {
        s: [0],
        p: {
          h: 1,
        },
      },
    ]);

    if (options.s) {
      for (const style of options.s) {
        StyleCollection.styles(style[0]).set(style[1]);
      }
    }

    if (options.k) {
      for (const keyframes of options.k) {
        StyleCollection.keyframes(keyframes[0]).set(keyframes[1]);
      }
    }

    if (options.vr) {
      for (const entry of options.vr) {
        rootVariables(entry[0]).set(entry[1]);
      }
    }

    if (options.vu) {
      for (const entry of options.vu) {
        rootVariables(entry[0]).set(entry[1]);
      }
    }

    for (const effect of observableBatch.current) {
      effect.run();
    }

    observableBatch.current = undefined;
  },
};

export const StyleCollection = globalThis.__react_native_css_style_collection;

function isDeepEqual(a: unknown, b: unknown): boolean {
  const aArray = Array.isArray(a);
  const bArray = Array.isArray(b);
  const requiresKeyComparison =
    typeof a === "object" && typeof b === "object" && aArray === bArray;

  // Only compare keys when both are an object or array
  // This does not account for complex types like Date/Regex, because we don't use them
  if (!requiresKeyComparison) return a === b;

  // Make either are not null
  if (!a || !b) {
    return a === b;
  }

  // Shortcut for arrays
  if (aArray && bArray && a.length !== b.length) {
    return false;
  }

  // Compare a to b
  for (const key in a) {
    if (
      !isDeepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      )
    ) {
      return false;
    }
  }

  // Compare b to a
  for (const key in b) {
    if (!(key in a)) {
      return false;
    }
  }

  return true;
}
