import type { StyleDescriptor, StyleFunction } from "react-native-css/compiler";
import {
  rootVariables,
  universalVariables,
} from "react-native-css/native-internal";
import { isStyleDescriptorArray } from "react-native-css/utilities";

import { VAR_SYMBOL, type Getter } from "../reactivity";
import type { ResolveValueOptions, SimpleResolveValue } from "./resolve";

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

  try {
    let value = resolve(inlineVariables?.[name] as StyleDescriptor);
    if (variableCycles.has(name)) return resolve(fallback);
    if (value !== undefined) {
      options.inlineVariables ??= { [VAR_SYMBOL]: "inline" };
      options.inlineVariables[name] = value;

      return value;
    }

    // A universal selector declares the variable on this element. It has lower
    // specificity than the element's class declarations, but beats inheritance.
    value = resolve(get(universalVariables(name)));
    if (variableCycles.has(name)) return resolve(fallback);
    if (value !== undefined) {
      options.inlineVariables ??= { [VAR_SYMBOL]: "inline" };
      options.inlineVariables[name] = value;
      return value;
    }

    // Guards retain the ancestor's raw descriptor, matching the context value.
    if (name in variables) {
      renderGuards?.push(["v", name, variables[name]]);
      value = resolve(variables[name]);
      return variableCycles.has(name) ? resolve(fallback) : value;
    }

    value = resolve(get(rootVariables(name)));
    if (variableCycles.has(name)) return resolve(fallback);
    if (value !== undefined) {
      options.inlineVariables ??= { [VAR_SYMBOL]: "inline" };
      options.inlineVariables[name] = value;
      return value;
    }

    return resolve(fallback);
  } finally {
    variableHistory.delete(name);
  }
}
