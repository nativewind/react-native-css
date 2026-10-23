import { Platform, PlatformColor } from "react-native";

import type {
  RootVariables,
  StyleDescriptor,
  VariableValue,
} from "react-native-css/compiler";

import { testMediaQuery } from "../native/conditions/media-query";
import { family, observable, type Observable } from "../native/reactivity";

// Nullable so a reload can retract a registration
type VariableArg = VariableValue[] | undefined;

const rootVariableFamily = () => {
  return family<string, Observable<StyleDescriptor, VariableArg>>(() => {
    const obs = observable<StyleDescriptor, VariableArg>(
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

interface RootVariableRegistries {
  root: RootVariableRegistry;
  universal: RootVariableRegistry;
}

declare global {
  var __react_native_css_root_variable_registries:
    | RootVariableRegistries
    | undefined;
  var __react_native_css_registered_initial_values:
    | RootVariableRegistry
    | undefined;
  var __react_native_css_non_inherited_variables: Set<string> | undefined;
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
  rootVariableFamily();
globalThis.__react_native_css_non_inherited_variables ??= new Set<string>();

export const registeredInitialValues =
  globalThis.__react_native_css_registered_initial_values;

export const nonInheritedVariables =
  globalThis.__react_native_css_non_inherited_variables;

// The inherit flag belongs to the registration, so every channel that publishes variables goes through here
export function assignInheritedVariables<TValue>(
  target: Record<string, TValue>,
  entries: Iterable<readonly [string, TValue]>,
) {
  for (const [name, value] of entries) {
    if (nonInheritedVariables.has(name)) {
      continue;
    }

    target[name] = value;
  }
}

// Retracted through set(undefined), since clearing the family would strand the observables mounted elements read
export function replaceRegisteredInitialValues(entries: RootVariables = []) {
  const registered = new Set(entries.map(([name]) => name));

  // Snapshotted, since a retraction can notify a reader that looks up a new name mid-walk
  for (const name of Array.from(registeredInitialValues.keys())) {
    if (!registered.has(name)) {
      registeredInitialValues(name).set(undefined);
    }
  }

  for (const [name, value] of entries) {
    registeredInitialValues(name).set(value);
  }
}

// Clearing suffices between tests, where nothing stays mounted to strand
export function resetVariableRegistries() {
  rootVariables.clear();
  universalVariables.clear();
  registeredInitialValues.clear();
  nonInheritedVariables.clear();

  seedRootRegistry(rootVariables);
}
