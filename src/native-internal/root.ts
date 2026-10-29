import { Platform, PlatformColor } from "react-native";

import type { StyleDescriptor, VariableValue } from "react-native-css/compiler";
import { isDeepEqual } from "react-native-css/utilities";

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

type RootVariableRegistry = ReturnType<typeof rootVariableFamily>;

// Static, since the compiler records only the @property rules no condition wraps
const registeredInitialValueFamily = () => {
  return family<string, Observable<StyleDescriptor>>(() =>
    observable<StyleDescriptor>(undefined, isDeepEqual),
  );
};

const registeredInheritanceFamily = () => {
  return family<string, Observable<boolean>>(() => observable(true));
};

interface RootVariableRegistries {
  root: RootVariableRegistry;
  universal: RootVariableRegistry;
}

declare global {
  var __react_native_css_root_variable_registries:
    | RootVariableRegistries
    | undefined;
  var __react_native_css_registered_initial_values:
    | ReturnType<typeof registeredInitialValueFamily>
    | undefined;
  var __react_native_css_registered_inheritance:
    | ReturnType<typeof registeredInheritanceFamily>
    | undefined;
}

function seedRootRegistry(root: RootVariableRegistry) {
  root("__rn-css-rem").set([[14]]);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  root("__rn-css-color").set([
    [
      Platform.OS === "ios"
        ? PlatformColor("label", "labelColor")
        : PlatformColor("?attr/textColorPrimary", "SystemBaseHighColor"),
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any);
}

// Seeded with the registries, so a copy that loads after the stylesheet inject keeps the project's rem
function createRootVariableRegistries(): RootVariableRegistries {
  const registries: RootVariableRegistries = {
    root: rootVariableFamily(),
    universal: rootVariableFamily(),
  };

  seedRootRegistry(registries.root);

  return registries;
}

// The exports map gives import and require different builds, and Metro resolves each per requesting module
globalThis.__react_native_css_root_variable_registries ??=
  createRootVariableRegistries();

export const rootVariables =
  globalThis.__react_native_css_root_variable_registries.root;
export const universalVariables =
  globalThis.__react_native_css_root_variable_registries.universal;

// Pinned to globalThis, since Metro can load two copies of this module and StyleCollection injects through one
globalThis.__react_native_css_registered_initial_values ??=
  registeredInitialValueFamily();
globalThis.__react_native_css_registered_inheritance ??=
  registeredInheritanceFamily();

export const registeredInitialValues =
  globalThis.__react_native_css_registered_initial_values;

export const registeredInheritance =
  globalThis.__react_native_css_registered_inheritance;

// Clearing suffices between tests, where nothing stays mounted to strand
export function resetVariableRegistries() {
  rootVariables.clear();
  universalVariables.clear();
  registeredInitialValues.clear();
  registeredInheritance.clear();

  seedRootRegistry(rootVariables);
}
