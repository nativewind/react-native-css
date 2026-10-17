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
import type {
  ResolveValueOptions,
  SimpleResolveValue,
  Substitution,
} from "./resolve";

// A variable rncss publishes itself carries a property's computed value, which always exists, so one nothing publishes leaves the property its default
const LIBRARY_VARIABLE_PREFIX = "__rn-css-";

function isLibraryVariable(name: string): boolean {
  return name.startsWith(LIBRARY_VARIABLE_PREFIX);
}

// What one source declares for the variable: nothing, its parent's value, the guaranteed-invalid value, or a value
type Declaration =
  | { readonly kind: "absent" }
  | { readonly kind: "inherit" }
  | { readonly kind: "guaranteed-invalid" }
  | { readonly kind: "value"; readonly value: unknown };

const ABSENT: Declaration = { kind: "absent" };
const INHERIT: Declaration = { kind: "inherit" };
const GUARANTEED_INVALID: Declaration = { kind: "guaranteed-invalid" };

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

  // css-variables-1 §3.1: a var() with no fallback for a variable that has no value leaves its declaration invalid at computed-value time
  const substituteFallback = (): unknown => {
    if (
      fallback === undefined &&
      options.substitution &&
      !isLibraryVariable(name)
    ) {
      options.substitution.failed = true;
    }

    return resolve(fallback);
  };

  if (variableCycles.has(name)) return substituteFallback();

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
    if (value !== undefined) {
      options.inlineVariables ??= { [VAR_SYMBOL]: "inline" };
      options.inlineVariables[name] = value;
    }

    return value;
  };

  // css-variables-1 §3.1: a value a var() leaves without one, like a member of a cycle, is the guaranteed-invalid value
  const readDeclaration = (
    descriptor: StyleDescriptor | undefined,
  ): Declaration => {
    if (descriptor === undefined) {
      return ABSENT;
    } else if (isGuaranteedInvalidValue(descriptor)) {
      return GUARANTEED_INVALID;
    } else if (isInheritedValue(descriptor)) {
      return INHERIT;
    }

    const outer = options.substitution;
    const substitution: Substitution = { failed: false, emptied: false };
    options.substitution = substitution;

    try {
      const value = resolve(descriptor);

      return substitution.failed || variableCycles.has(name)
        ? GUARANTEED_INVALID
        : { kind: "value", value };
    } finally {
      options.substitution = outer;
    }
  };

  // The parent's value: what it hands down, or else what `*` declares on it, then what :root does
  const readParentValue = (readsUniversal: boolean): unknown => {
    const handedDown = readOwnEntry(variables, name);

    // Guards retain the ancestor's raw descriptor, matching the context value
    if (handedDown !== undefined) {
      renderGuards?.push(["v", name, handedDown]);
      const inherited = readDeclaration(handedDown);

      if (inherited.kind === "value") {
        return inherited.value;
      } else if (inherited.kind === "guaranteed-invalid") {
        return substituteFallback();
      }
    }

    if (readsUniversal) {
      const universal = readDeclaration(get(universalVariables(name)));

      if (universal.kind === "value") {
        return memoise(universal.value);
      } else if (universal.kind === "guaranteed-invalid") {
        return substituteFallback();
      }
    }

    // At the root a keyword resolves to nothing, so the fallback applies
    const root = readDeclaration(get(rootVariables(name)));

    return root.kind === "value" ? memoise(root.value) : substituteFallback();
  };

  try {
    const own = readDeclaration(readOwnEntry(inlineVariables, name));

    switch (own.kind) {
      case "value":
        return memoise(own.value);
      case "guaranteed-invalid":
        return substituteFallback();
      case "inherit":
        // A custom property set to `inherit` takes its parent's value, over every declaration on the element
        return readParentValue(true);
      case "absent":
        break;
      default:
        own satisfies never;
    }

    // A universal selector declares the variable on every element: below a class, above inheritance
    const universal = readDeclaration(get(universalVariables(name)));

    switch (universal.kind) {
      case "value":
        return memoise(universal.value);
      case "guaranteed-invalid":
        return substituteFallback();
      case "inherit":
      case "absent":
        return readParentValue(false);
      default:
        universal satisfies never;
        return;
    }
  } finally {
    variableHistory.delete(name);
  }
}

// A variable's name is its own, never a property every object inherits, and an entry with no value is no declaration
function readOwnEntry(
  record: Readonly<Record<string, unknown>> | undefined,
  name: string,
): StyleDescriptor | undefined {
  return record !== undefined && Object.hasOwn(record, name)
    ? (record[name] as StyleDescriptor | undefined)
    : undefined;
}
