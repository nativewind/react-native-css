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
  } = options;

  const args = fn[2];

  let name: string | undefined;
  let fallback: StyleDescriptor | undefined;

  if (typeof args === "string") {
    name = args;
  } else {
    const result = resolve(args);

    if (isStyleDescriptorArray(result)) {
      name = result[0] as string;
      fallback = result[1];
    }
  }

  if (typeof name !== "string") {
    return;
  }

  /**
   * The names whose resolution is currently in progress, shared through
   * `options` so every nested resolve below sees the same set.
   *
   * A variable's value can name the variable again — directly
   * (`--a: var(--a)`), through a fallback, or around a longer chain — and a
   * variable is handed to a descendant UNRESOLVED, so resolving it re-enters
   * here with the same name and no base case. A name is registered before any
   * of its values are resolved and removed once they are, which makes this a
   * resolution STACK rather than a visited set: a genuine cycle is cut on
   * re-entry, while a name read twice in sequence resolves both times.
   */
  const namesBeingResolved = (options.variableHistory ??= new Set<string>());

  if (namesBeingResolved.has(name)) {
    return;
  }

  namesBeingResolved.add(name);

  try {
    if (name in variables) {
      renderGuards?.push(["v", name, variables[name]]);
      return resolve(variables[name]);
    }

    let value = resolve(inlineVariables?.[name] as StyleDescriptor);
    if (value !== undefined) {
      options.inlineVariables ??= { [VAR_SYMBOL]: "inline" };
      options.inlineVariables[name] = value;

      return value;
    }

    value = resolve(variables[name]);
    if (value !== undefined) {
      renderGuards?.push(["v", name, value]);
      options.inlineVariables ??= { [VAR_SYMBOL]: "inline" };
      options.inlineVariables[name] = value;

      return value;
    }

    value = resolve(get(universalVariables(name)));
    if (value !== undefined) {
      options.inlineVariables ??= { [VAR_SYMBOL]: "inline" };
      options.inlineVariables[name] = value;
      return value;
    }

    value = resolve(get(rootVariables(name)));
    if (value !== undefined) {
      options.inlineVariables ??= { [VAR_SYMBOL]: "inline" };
      options.inlineVariables[name] = value;
      return value;
    }

    return resolve(fallback);
  } finally {
    namesBeingResolved.delete(name);
  }
}
