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

export const rootVariables = rootVariableFamily();
export const universalVariables = rootVariableFamily();

/**
 * The `initial-value` of an `@property` rule: what a custom property resolves to on an
 * element that declares it nowhere. Separate from rootVariables because a `:root`
 * declaration is a value the root element HAS and descendants read by inheritance, which
 * is the one thing a non-inheriting property never does.
 *
 * A registration carries a single value, so each entry holds one — the family shape is
 * shared with the other two so a re-injected stylesheet notifies its readers.
 */
export const registeredInitialValues = rootVariableFamily();

declare global {
  var __react_native_css_non_inherited_variables: Set<string> | undefined;
}

// Pinned to globalThis like style-collection.ts and variables.tsx. The exports map splits
// import and require onto different builds and Metro resolves that per requesting module,
// so two copies of this file can load. StyleCollection is globalThis-pinned, so whichever
// copy wins it does all the injecting and fills ITS Set — a rules.ts bound to the other
// copy would read an empty one and the filter would silently never fire.
globalThis.__react_native_css_non_inherited_variables ??= new Set<string>();

export const nonInheritedVariables =
  globalThis.__react_native_css_non_inherited_variables;

/**
 * Copy the custom properties an element publishes to its descendants. A property
 * registered `inherits: false` is withheld, so the descendant resolves the registered
 * initial value rather than the ancestor's. Every channel that builds a VariableContext
 * goes through here — a stylesheet rule, an inline `vars()`, a VariableContextProvider —
 * because the inherit flag belongs to the registration, not to the declaration that set it
 */
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

function seedRootVariables() {
  rootVariables("__rn-css-rem").set([[14]]);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  rootVariables("__rn-css-color").set([
    [
      Platform.OS === "ios"
        ? PlatformColor("label", "labelColor")
        : PlatformColor("?attr/textColorPrimary", "SystemBaseHighColor"),
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any);
}

seedRootVariables();

/**
 * Return every variable registry to its boot state, seeds included.
 *
 * A stylesheet reload only overwrites the names the new sheet mentions, so a name it
 * drops keeps the value the previous one gave it. That is what a reload should do to a
 * running app and the opposite of what one test should do to the next.
 */
export function resetVariableRegistries() {
  rootVariables.clear();
  universalVariables.clear();
  registeredInitialValues.clear();
  nonInheritedVariables.clear();

  seedRootVariables();
}
