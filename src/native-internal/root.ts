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

          // A `:root` declaration belongs to no element, so it reads the root's directionality.
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

// Seeded with the registries, so a copy that loads after the stylesheet inject keeps the project's rem
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

// The exports map gives import and require different builds, and Metro resolves each per requesting module
globalThis.__react_native_css_root_variable_registries ??=
  createRootVariableRegistries();

export const rootVariables =
  globalThis.__react_native_css_root_variable_registries.root;
export const universalVariables =
  globalThis.__react_native_css_root_variable_registries.universal;
