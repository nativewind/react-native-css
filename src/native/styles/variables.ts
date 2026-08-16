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
   * `options` so every nested resolve below sees the same stack.
   *
   * A variable's value can name the variable again — directly
   * (`--a: var(--a)`), through a fallback, or around a longer chain — and a
   * variable is handed to a descendant UNRESOLVED, so resolving it re-enters
   * here with the same name and no base case.
   *
   * A name is registered before any of its values are resolved and removed
   * once they are, which makes this a resolution STACK rather than a visited
   * set. Both halves are load-bearing:
   *
   * - Registering cuts a genuine cycle on re-entry.
   * - Removing per frame keeps a name readable again once its own resolution
   *   has finished, which a name read twice within ONE declaration needs
   *   (`box-shadow: var(--c) 1px 1px, var(--c) 2px 2px`). Only the
   *   within-one-declaration case depends on it — `applyDeclarations` builds
   *   a fresh options object per declaration, so two declarations never share
   *   a stack. Emptying the whole stack instead would let a second branch of
   *   one value start the cycle over: `--a: var(--b) var(--c)` where both
   *   name `--a` recurses forever.
   *
   * This bounds CYCLES only. A non-circular chain long enough to exhaust the
   * JS stack still throws, at a depth that varies with how deep the stack
   * already is when resolution starts.
   */
  const namesBeingResolved = (options.namesBeingResolved ??= new Set<string>());

  /**
   * A variable in a cycle is invalid at computed-value time, so the cut yields
   * nothing rather than the fallback of the reference that re-entered it.
   *
   * The property reading it loses its value, or keeps a TRUNCATED one where
   * the cycle is only part of a larger value — `resolveValue` filters the
   * missing piece out of a descriptor array and keeps the surviving siblings.
   */
  if (namesBeingResolved.has(name)) {
    return;
  }

  namesBeingResolved.add(name);

  try {
    /**
     * A name present in the inherited variables resolves to whatever that
     * value gives, `fallback` included: an inherited name that resolves to
     * nothing swallows `var(--name, blue)`'s fallback rather than using it.
     * That holds for any unresolvable inherited value, not just a cyclic one.
     */
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
