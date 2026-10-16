import type { StyleDescriptor, StyleFunction } from "react-native-css/compiler";
import {
  rootVariables,
  universalVariables,
} from "react-native-css/native-internal";
import {
  isGuaranteedInvalidValue,
  isInheritedValue,
  isStyleDescriptorArray,
} from "react-native-css/utilities";

import { VAR_SYMBOL, type Getter } from "../reactivity";
import type { ResolveValueOptions, SimpleResolveValue } from "./resolve";

type Lookup =
  | { readonly settled: true; readonly value: unknown }
  | { readonly settled: false };

export function varResolver(
  resolve: SimpleResolveValue,
  fn: StyleFunction,
  get: Getter,
  options: ResolveValueOptions,
) {
  const {
    renderGuards,
    inheritedVariables: variables = { [VAR_SYMBOL]: true },
    inlineVariables,
    variableHistory = (options.variableHistory ??= new Set()),
    variableCycles = (options.variableCycles ??= new Set()),
  } = options;

  const args = fn[2];

  let name: string | undefined;
  let fallback: StyleDescriptor | undefined;

  if (typeof args === "string") {
    name = args;
  } else {
    // Fallbacks are substituted only when needed, after reading the variable.
    if (isStyleDescriptorArray(args)) {
      name = args[0] as string;
      fallback = args[1];
    }
  }

  if (typeof name !== "string") {
    return;
  }

  if (variableCycles.has(name)) return resolve(fallback);

  // Share the active resolution path with recursive calls. Mark only the
  // actual cycle, so a dependent variable can still use its own fallback.
  if (variableHistory.has(name)) {
    let inCycle = false;
    for (const dependency of variableHistory) {
      if (dependency === name) inCycle = true;
      if (inCycle) variableCycles.add(dependency);
    }
    return;
  }

  variableHistory.add(name);

  const memoise = (value: unknown) => {
    options.inlineVariables ??= { [VAR_SYMBOL]: "inline" };
    options.inlineVariables[name] = value;
    return value;
  };

  // A universal selector declares the variable on every element: below a class, above inheritance
  const lookUpUniversal = (): Lookup => {
    const universal = get(universalVariables(name));
    if (isGuaranteedInvalidValue(universal)) {
      return { settled: true, value: resolve(fallback) };
    } else if (isInheritedValue(universal)) {
      return { settled: false };
    }

    const value = resolve(universal);
    if (variableCycles.has(name)) {
      return { settled: true, value: resolve(fallback) };
    }

    return value === undefined
      ? { settled: false }
      : { settled: true, value: memoise(value) };
  };

  try {
    const declared = inlineVariables?.[name] as StyleDescriptor;
    if (isGuaranteedInvalidValue(declared)) return resolve(fallback);

    // A custom property set to `inherit` takes its parent's value, over every declaration on the element
    const inheriting = isInheritedValue(declared);

    if (!inheriting) {
      const value = resolve(declared);
      if (variableCycles.has(name)) return resolve(fallback);
      if (value !== undefined) return memoise(value);

      const universal = lookUpUniversal();
      if (universal.settled) return universal.value;
    }

    // Guards retain the ancestor's raw descriptor, matching the context value. An entry with no value is no declaration.
    if (Object.hasOwn(variables, name) && variables[name] !== undefined) {
      renderGuards?.push(["v", name, variables[name]]);
      if (isGuaranteedInvalidValue(variables[name])) return resolve(fallback);
      const value = resolve(variables[name]);
      return variableCycles.has(name) ? resolve(fallback) : value;
    }

    if (inheriting) {
      // Undeclared in the context, the parent's own value is what `*` declares on it
      const universal = lookUpUniversal();
      if (universal.settled) return universal.value;
    }

    // At the root a keyword resolves to nothing, so the fallback applies
    const value = resolve(get(rootVariables(name)));
    if (variableCycles.has(name)) return resolve(fallback);
    if (value !== undefined) return memoise(value);

    return resolve(fallback);
  } finally {
    variableHistory.delete(name);
  }
}
