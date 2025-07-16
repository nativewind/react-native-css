/* eslint-disable */
import type { StyleFunction } from "../../../compiler";
import {
  rootVariables,
  universalVariables,
  VAR_SYMBOL,
  type Getter,
} from "../reactivity";
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

  const names = fn[2];

  if (!names) return;

  for (const nameDescriptor of names) {
    const name = resolve(nameDescriptor);

    // If this recurses back to the same variable, we need to stop
    if (variableHistory.has(name)) {
      return;
    }

    if (name in variables) {
      renderGuards?.push(["v", name, variables[name]]);
      return variables[name];
    }

    variableHistory.add(name);

    let value = resolve(inlineVariables?.[name]);
    if (value !== undefined) {
      variables[name] = value;

      return value;
    }

    value = resolve(variables[name]);
    if (value !== undefined) {
      renderGuards?.push(["v", name, value]);
      variables[name] = value;

      return value;
    }

    value = resolve(get(universalVariables(name)));
    if (value !== undefined) {
      variables[name] = value;
      return value;
    }

    value = resolve(get(rootVariables(name)));
    if (value !== undefined) {
      variables[name] = value;
      return value;
    }

    return value;
  }
}
