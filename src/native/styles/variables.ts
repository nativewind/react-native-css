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
    variableHistory = new Set(),
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

  // If this recurses back to the same variable, we need to stop
  if (variableHistory.has(name)) {
    return;
  }

  variableHistory.add(name);

  let value = resolve(inlineVariables?.[name] as StyleDescriptor);
  if (value !== undefined) {
    options.inlineVariables ??= { [VAR_SYMBOL]: "inline" };
    options.inlineVariables[name] = value;

    return value;
  }

  if (name in variables) {
    // The RAW inherited descriptor, not the resolved value: `testGuards`
    // compares this against the next render's context, and a resolved value
    // would never match.
    renderGuards?.push(["v", name, variables[name]]);
    return resolve(variables[name]);
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
}
