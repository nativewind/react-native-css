import type { StyleDescriptor, StyleFunction } from "react-native-css/compiler";
import {
  rootVariables,
  universalVariables,
} from "react-native-css/native-internal";
import {
  INHERITED_COLOR_VARIABLE,
  isGuaranteedInvalidValue,
  isInheritedValue,
  isStyleDescriptorArray,
} from "react-native-css/utilities";

import {
  PUBLISHER_INHERITED_VARIABLES,
  VAR_SYMBOL,
  type Getter,
  type VariableContextValue,
} from "../reactivity";
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
      const inherited =
        name === INHERITED_COLOR_VARIABLE
          ? readPublishedColor(handedDown, followPublisherLink())
          : readDeclaration(handedDown);

      if (inherited.kind === "value") {
        return inherited.value;
      } else if (inherited.kind === "guaranteed-invalid") {
        return name === INHERITED_COLOR_VARIABLE
          ? readInvalidPublishedColor(variables)
          : substituteFallback();
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

  // What the parent inherited, which its published colour's `currentcolor` reads; a parent that re-renders hands down a new link
  const followPublisherLink = (): VariableContextValue | undefined => {
    const link = variables[PUBLISHER_INHERITED_VARIABLES];

    if (link !== undefined) {
      renderGuards?.push(["v", PUBLISHER_INHERITED_VARIABLES, link]);
    }

    return link;
  };

  // A colour an element publishes resolves its own `currentcolor` against what that element inherited, the scope above
  const readPublishedColor = (
    descriptor: StyleDescriptor | undefined,
    scopeAbove: VariableContextValue | undefined,
  ): Declaration => {
    const outer = options.inheritedColorScope;
    options.inheritedColorScope = scopeAbove;

    try {
      return readDeclaration(descriptor);
    } finally {
      options.inheritedColorScope = outer;
    }
  };

  // css-color-4 §4.3: `currentcolor` inside a published colour is the colour its publisher inherited, not the published one again
  const readInheritedColorFrom = (scope: VariableContextValue): unknown => {
    const handedDown = readOwnEntry(scope, name);

    if (handedDown !== undefined) {
      // A guard compares the element's own inherited variables, which reach a scope further up only through the link guarded there
      const inheritsHere = scope === variables;

      if (inheritsHere) {
        renderGuards?.push(["v", name, handedDown]);
      }

      const inherited = readPublishedColor(
        handedDown,
        inheritsHere
          ? followPublisherLink()
          : scope[PUBLISHER_INHERITED_VARIABLES],
      );

      if (inherited.kind === "value") {
        return inherited.value;
      } else if (inherited.kind === "guaranteed-invalid") {
        return readInvalidPublishedColor(scope);
      }
    }

    const root = readPublishedColor(get(rootVariables(name)), undefined);

    return root.kind === "value" ? root.value : substituteFallback();
  };

  // css-cascade-5 §7.3.3: a colour invalid at computed-value time is unset, which on `color` is the colour its element inherited
  const readInvalidPublishedColor = (scope: VariableContextValue): unknown => {
    const scopeAbove = scope[PUBLISHER_INHERITED_VARIABLES];

    return scopeAbove === undefined
      ? substituteFallback()
      : readInheritedColorFrom(scopeAbove);
  };

  const isInheritedColor = name === INHERITED_COLOR_VARIABLE;

  if (isInheritedColor && options.inheritedColorScope !== undefined) {
    return readInheritedColorFrom(options.inheritedColorScope);
  }

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

  try {
    const own = isInheritedColor
      ? readPublishedColor(readOwnEntry(inlineVariables, name), variables)
      : readDeclaration(readOwnEntry(inlineVariables, name));

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
