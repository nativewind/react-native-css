import type {
  InlineVariable,
  StyleDescriptor,
  StyleFunction,
} from "react-native-css/compiler";
import {
  registeredInheritance,
  registeredInitialValues,
  rootVariables,
  universalVariables,
} from "react-native-css/native-internal";
import {
  isDeepEqual,
  isStyleDescriptorArray,
  isStyleFunction,
} from "react-native-css/utilities";

import {
  VAR_SYMBOL,
  type Getter,
  type VariableContextValue,
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
    variableHistory = (options.variableHistory ??= new Set()),
    variableCycles = (options.variableCycles ??= new Set()),
  } = options;

  const name = variableName(fn[2]);
  if (name === undefined) {
    return;
  }

  // Fallbacks are substituted only when needed, after reading the variable.
  const fallback = variableFallback(fn[2]);

  if (variableCycles.has(name)) return resolve(fallback);

  // Share the active resolution path with recursive calls.
  if (variableHistory.has(name)) {
    markCycle(variableHistory, name, variableCycles);
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

    // An ancestor's variables and :root reach an element only by inheritance, which a non-inheriting registration switches off
    // Guards retain the ancestor's raw descriptor, matching the context value.
    if (name in variables) {
      if (inherits(name, get)) {
        renderGuards?.push(["v", name, variables[name]]);
        value = resolve(variables[name]);
        // An ancestor's guaranteed-invalid value inherits as such, so the reader takes its own fallback
        return value === undefined || variableCycles.has(name)
          ? resolve(fallback)
          : value;
      }

      renderGuards?.push(["n", name, variables[name]]);
    }

    const rootValue = get(rootVariables(name));
    if (rootValue !== undefined && inherits(name, get)) {
      value = resolve(
        Array.isArray(rootValue)
          ? substituteOwnValues(
              rootValue,
              (reference) => get(rootVariables(reference)),
              get,
            )
          : rootValue,
      );
      if (variableCycles.has(name)) return resolve(fallback);
      if (value !== undefined) {
        options.inlineVariables ??= { [VAR_SYMBOL]: "inline" };
        options.inlineVariables[name] = value;
        return value;
      }
    }

    // A registered initial value applies only where no declaration reaches the element
    value = resolve(get(registeredInitialValues(name)));
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

function inherits(name: string, get: Getter) {
  return get(registeredInheritance(name));
}

// A value that inherits is computed where it is declared, so its references to non-inheriting properties take that scope's own values
function substituteOwnValues(
  value: StyleDescriptor,
  ownValue: (name: string) => StyleDescriptor,
  get: Getter,
  history = new Set<string>(),
  cycles = new Set<string>(),
): StyleDescriptor {
  if (!Array.isArray(value)) {
    return value;
  }

  const substitute = (descriptor: StyleDescriptor) =>
    substituteOwnValues(descriptor, ownValue, get, history, cycles);

  if (!isStyleFunction(value)) {
    let substituted: StyleDescriptor[] | undefined;
    value.forEach((item, index) => {
      const substitutedItem = substitute(item);
      if (substitutedItem !== item) {
        substituted ??= [...value];
        substituted[index] = substitutedItem;
      }
    });
    return substituted ?? value;
  }

  const name = value[1] === "var" ? variableName(value[2]) : undefined;

  if (name === undefined) {
    const substitutedArguments = substitute(value[2]);
    return substitutedArguments === value[2]
      ? value
      : withArguments(value, substitutedArguments);
  }

  const fallback = variableFallback(value[2]);

  if (inherits(name, get)) {
    const substitutedFallback = substitute(fallback);
    return substitutedFallback === fallback
      ? value
      : withArguments(value, [name, substitutedFallback]);
  }

  if (cycles.has(name)) {
    return substitute(fallback);
  }

  if (history.has(name)) {
    markCycle(history, name, cycles);
    return;
  }

  history.add(name);
  try {
    const own = substitute(
      ownValue(name) ??
        get(universalVariables(name)) ??
        get(registeredInitialValues(name)),
    );
    return own === undefined || cycles.has(name) ? substitute(fallback) : own;
  } finally {
    history.delete(name);
  }
}

// Returns whether a value the element publishes differs from the one it published last
export function substituteOwnReferences(
  variables: VariableContextValue,
  ruleVariableNames: ReadonlySet<string>,
  inlineVariables: ReadonlySet<InlineVariable>,
  previous: Readonly<VariableContextValue> | undefined,
  get: Getter,
): boolean {
  // Only inheriting values are rewritten, so a non-inheriting one still reads as declared
  const ownValue = (name: string) =>
    ruleVariableNames.has(name) || declaresInline(inlineVariables, name)
      ? variables[name]
      : undefined;

  let changed = false;

  // An inline vars() value is a value, never a reference, so only the rules' variables need rewriting
  for (const name of ruleVariableNames) {
    // Read without subscribing, so a later flip of the element's own name reaches this publication when the element next updates
    if (registeredInheritance(name).get()) {
      const declared = variables[name];
      const value = substituteOwnValues(declared, ownValue, get);

      if (value !== declared) {
        // The previous descriptor keeps descendants' guards holding while nothing changed
        variables[name] =
          previous && isDeepEqual(previous[name], value)
            ? previous[name]
            : value;
      }
    }

    changed ||= previous?.[name] !== variables[name];
  }

  return changed;
}

function declaresInline(
  inlineVariables: ReadonlySet<InlineVariable>,
  name: string,
) {
  for (const inlineVariable of inlineVariables) {
    if (name in inlineVariable) {
      return true;
    }
  }
  return false;
}

function withArguments(
  styleFunction: StyleFunction,
  functionArguments: StyleDescriptor,
): StyleFunction {
  return styleFunction.length === 4
    ? [styleFunction[0], styleFunction[1], functionArguments, styleFunction[3]]
    : [styleFunction[0], styleFunction[1], functionArguments];
}

function variableName(variableArguments: StyleDescriptor): string | undefined {
  if (typeof variableArguments === "string") {
    return variableArguments;
  }

  return isStyleDescriptorArray(variableArguments) &&
    typeof variableArguments[0] === "string"
    ? variableArguments[0]
    : undefined;
}

function variableFallback(variableArguments: StyleDescriptor): StyleDescriptor {
  return isStyleDescriptorArray(variableArguments)
    ? variableArguments[1]
    : undefined;
}

// Marks only the actual cycle, so a variable that depends on it can still use its own fallback
function markCycle(
  history: ReadonlySet<string>,
  name: string,
  cycles: Set<string>,
) {
  let inCycle = false;
  for (const dependency of history) {
    if (dependency === name) inCycle = true;
    if (inCycle) cycles.add(dependency);
  }
}
