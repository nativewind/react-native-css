import { Platform, PlatformColor } from "react-native";

import type { StyleDescriptor, VariableValue } from "react-native-css/compiler";

import { testMediaQuery } from "../native/conditions/media-query";
import { family, observable, type Observable } from "../native/reactivity";

const rootVariableFamily = () => {
  return family<string, Observable<StyleDescriptor, VariableValue[]>>(() => {
    const obs = observable<StyleDescriptor, VariableValue[]>(
      (read, variableValue) => {
        if (!variableValue) return undefined;

        for (const [value, mediaQuery] of variableValue) {
          if (!mediaQuery) {
            return value;
          }

          if (testMediaQuery(mediaQuery, read)) {
            return value;
          }
        }

        return undefined;
      },
    );

    return obs;
  });
};

interface RootVariableRegistries {
  root: ReturnType<typeof rootVariableFamily>;
  universal: ReturnType<typeof rootVariableFamily>;
}

declare global {
  var __react_native_css_root_variable_registries:
    | RootVariableRegistries
    | undefined;
}

/**
 * Create BOTH registries and seed them, as one step.
 *
 * Creating and seeding cannot be split. A bare `??=` on the registries alone
 * would leave the seeds running unconditionally, so a second copy initialising
 * AFTER the stylesheet inject re-runs `set([[14]])` and clobbers a project's
 * own `:root { font-size: 16px }` back to 14 — silently rescaling every
 * rem-derived value to 87.5%. Both registries live behind ONE global for the
 * same reason: two globals could be half-initialised.
 */
function createRootVariableRegistries(): RootVariableRegistries {
  const registries: RootVariableRegistries = {
    root: rootVariableFamily(),
    universal: rootVariableFamily(),
  };

  registries.root("__rn-css-rem").set([[14]]);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  registries.root("__rn-css-color").set([
    [
      Platform.OS === "ios"
        ? PlatformColor("label", "labelColor")
        : PlatformColor("?attr/textColorPrimary", "SystemBaseHighColor"),
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any);

  return registries;
}

/**
 * The `:root` registries are GLOBAL.
 *
 * The package's `exports` map splits `import` and `require` onto different
 * builds and Metro resolves that condition per REQUESTING module, so a
 * compiled-CommonJS dependency and first-party source bind different copies of
 * this file. Every other stateful module here already guards against that
 * (`style-collection.ts`, `variables.tsx`); these two held runtime state and
 * did not, so a `:root` variable injected into one copy was invisible to the
 * other and the value silently fell back to its seed.
 */
export function resolveRootVariableRegistries(): RootVariableRegistries {
  return (globalThis.__react_native_css_root_variable_registries ??=
    createRootVariableRegistries());
}

const registries = resolveRootVariableRegistries();

export const rootVariables = registries.root;
export const universalVariables = registries.universal;
