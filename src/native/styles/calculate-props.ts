/* eslint-disable */
import type {
  InlineVariable,
  StyleDeclaration,
  StyleDescriptor,
  StyleFunction,
  StyleRule,
} from "react-native-css/compiler";
import {
  assignPublishedColor,
  assignRuleVariables,
  inheritedColorLookup,
  isStyleFunction,
  Specificity as S,
} from "react-native-css/utilities";

import type { RenderGuard } from "../conditions/guards";
import { applyValue } from "../objects";
import {
  assignInheritedVariables,
  VAR_SYMBOL,
  type Getter,
  type VariableContextValue,
} from "../reactivity";
import { transformKeys } from "./defaults";
import {
  isEmptySubstitution,
  resolveValue,
  type ResolveValueOptions,
  type Substitution,
} from "./resolve";

export function calculateProps(
  get: Getter,
  rules: (StyleRule | InlineVariable | VariableContextValue)[],
  guards: RenderGuard[] = [],
  inheritedVariables: VariableContextValue = {
    [VAR_SYMBOL]: true,
  },
  inlineVariables: InlineVariable = {
    [VAR_SYMBOL]: "inline",
  },
) {
  let normal: Record<string, any> | undefined;
  let important: Record<string, any> | undefined;

  const transformStyles: (() => void)[] = [];
  let publishedColor: StyleDescriptor | undefined;

  // css-variables-1 §3: a var() substitutes the element's computed custom property, so every rule's variables are assigned before any declaration resolves
  for (const rule of rules) {
    if (VAR_SYMBOL in rule) {
      if (typeof rule[VAR_SYMBOL] === "string") {
        Object.assign(inlineVariables, rule);
      } else {
        assignInheritedVariables(inheritedVariables, rule);
      }
    } else if (rule.v) {
      publishedColor =
        assignRuleVariables(inlineVariables, rule.v) ?? publishedColor;
    }
  }

  assignPublishedColor(inlineVariables, publishedColor);

  for (const rule of rules) {
    if (VAR_SYMBOL in rule || !rule.d) {
      continue;
    }

    let topLevelTarget = rule.s?.[S.Important]
      ? (important ??= {})
      : (normal ??= {});
    let target = topLevelTarget;

    const ruleTarget = rule.target || "style";

    if (typeof ruleTarget === "string") {
      target = target[ruleTarget] ??= {};
    } else if (ruleTarget) {
      for (const path of ruleTarget) {
        target = target[path] ??= {};
      }
    }

    applyDeclarations(
      get,
      rule.d,
      inlineVariables,
      inheritedVariables,
      transformStyles,
      guards,
      target,
      topLevelTarget,
    );
  }

  for (const transformStyle of transformStyles) {
    transformStyle();
  }

  return {
    normal,
    guards,
    important,
  };
}

export function applyDeclarations(
  get: Getter,
  declarations: StyleDeclaration[],
  inlineVariables: InlineVariable,
  inheritedVariables: VariableContextValue,
  transformStyles: (() => void)[] = [],
  guards: RenderGuard[] = [],
  target: Record<string, any> = {},
  topLevelTarget = target,
) {
  for (const declaration of declarations) {
    // The transform closures below run after the walk, so each must capture its own declaration's target
    let declarationTarget = target;

    if (!Array.isArray(declaration)) {
      // Static styles
      Object.assign(declarationTarget, declaration);
    } else {
      // Dynamic styles
      let value: any = declaration[0];
      let propPath = declaration[1];
      let prop: string | number;
      // Only the element's own `color`: a shadow's colour is a nested `color` key that keeps the cascading read
      const computingColor =
        (Array.isArray(propPath) ? propPath.join(".") : propPath) === "color";

      if (Array.isArray(propPath)) {
        const [first, ...rest] = propPath;

        if (!first) {
          continue;
        }

        const final = rest.pop();

        if (final) {
          if (first !== "&") {
            topLevelTarget[first] ??= {};
            declarationTarget = topLevelTarget[first];
          }

          let previousProp: string | number = first;
          let previousTarget = topLevelTarget;

          for (prop of rest) {
            if (prop.startsWith("[") && prop.endsWith("]")) {
              prop = Number(prop.slice(1, -1));

              if (!Array.isArray(previousTarget[previousProp])) {
                previousTarget[previousProp] = [];
                declarationTarget = previousTarget[previousProp];
              }
            }
            previousTarget = declarationTarget;
            previousProp = prop;

            declarationTarget[prop] ??= {};
            declarationTarget = declarationTarget[prop];
          }

          prop = final;
        } else {
          declarationTarget = topLevelTarget;
          prop = first;
        }
      } else {
        prop = propPath;
      }

      // An individual transform property composes into the `transform` list once every rule is walked, so it holds its place until then
      if (transformKeys.has(prop)) {
        const originalValue = value;
        value = { [prop]: true };

        transformStyles.push(() => {
          value = resolveDeclaration(originalValue, prop, get, {
            inlineVariables,
            inheritedVariables,
            renderGuards: guards,
            calculateProps,
            computingColor,
          });
          applyValue(declarationTarget, prop, value);
        });
      } else {
        value = resolveDeclaration(value, prop, get, {
          inlineVariables,
          inheritedVariables,
          renderGuards: guards,
          calculateProps,
          computingColor,
        });
      }

      applyValue(declarationTarget, prop, value);
    }
  }
}

// css-variables-1 §3.1: a declaration a var() leaves without a value is invalid at computed-value time, and behaves as if its value were `unset`
function resolveDeclaration(
  descriptor: StyleDescriptor,
  prop: string | number,
  get: Getter,
  options: ResolveValueOptions,
): unknown {
  const substitution: Substitution = { failed: false, emptied: false };
  const value = resolveValue(descriptor, get, { ...options, substitution });

  if (!isInvalidAtComputedValueTime(descriptor, value, substitution)) {
    return value === undefined && isUnsetDescriptor(descriptor) ? null : value;
  }

  // css-cascade-5 §7.3.3: `unset` resets the property even where its parser has no reset of its own
  return (
    resolveValue(
      unsetDescriptor(descriptor, prop, options.computingColor),
      get,
      options,
    ) ?? null
  );
}

// The compiler writes a CSS-wide keyword on a property the runtime parses as that parser's `unset`
function isUnsetDescriptor(descriptor: StyleDescriptor): boolean {
  return isStyleFunction(descriptor) && descriptor[2] === "unset";
}

// The `unset` the compiler writes for the same property: the inherited colour for `color`, the runtime parser's own reset for a property it parses, and the clearing literal otherwise
function unsetDescriptor(
  descriptor: StyleDescriptor,
  prop: string | number,
  computingColor: boolean | undefined,
): StyleDescriptor {
  if (computingColor) {
    return inheritedColorLookup();
  } else if (isStyleFunction(descriptor) && descriptor[1] === prop) {
    const [marker, name, , ...processing] = descriptor;
    return [marker, name, "unset", ...processing] as StyleFunction;
  }

  return "unset";
}

// A var() with no value and no fallback anywhere in the value, or a value its var()s leave empty
function isInvalidAtComputedValueTime(
  descriptor: StyleDescriptor,
  value: unknown,
  substitution: Readonly<Substitution>,
): boolean {
  if (substitution.failed || substitution.emptied) {
    return true;
  } else if (!readsVariable(descriptor)) {
    return false;
  }

  return value === undefined || isEmptySubstitution(descriptor, value);
}

function readsVariable(descriptor: StyleDescriptor): boolean {
  if (!Array.isArray(descriptor)) {
    return false;
  } else if (isStyleFunction(descriptor)) {
    return descriptor[1] === "var" || readsVariable(descriptor[2]);
  }

  return descriptor.some(readsVariable);
}
