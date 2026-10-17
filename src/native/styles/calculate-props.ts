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
import { applyValue, getDeepPath } from "../objects";
import {
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

  const delayedStyles: (() => void)[] = [];
  const transformStyles: (() => void)[] = [];
  let publishedColor: StyleDescriptor | undefined;

  for (const rule of rules) {
    if (VAR_SYMBOL in rule) {
      if (typeof rule[VAR_SYMBOL] === "string") {
        Object.assign(inlineVariables, rule);
      } else {
        Object.assign(inheritedVariables, rule);
      }
      continue;
    }

    if (rule.v) {
      publishedColor =
        assignRuleVariables(inlineVariables, rule.v) ?? publishedColor;
    }

    if (rule.d) {
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
        delayedStyles,
        transformStyles,
        guards,
        target,
        topLevelTarget,
      );
    }
  }

  assignPublishedColor(inlineVariables, publishedColor);

  for (const delayedStyle of delayedStyles) {
    delayedStyle();
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
  delayedStyles: (() => void)[] = [],
  transformStyles: (() => void)[] = [],
  guards: RenderGuard[] = [],
  target: Record<string, any> = {},
  topLevelTarget = target,
) {
  for (const declaration of declarations) {
    // The delayed and transform closures below run after the walk, so each must capture its own declaration's target
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

      const shouldDelay = declaration[2];

      if (shouldDelay || transformKeys.has(prop)) {
        /**
         * We need to delay the resolution of this value until after all
         * styles have been calculated. But another style might override
         * this value. So we set a placeholder value and only override
         * if the placeholder is preserved
         *
         * This also ensures the props exist, so setValue will properly
         * mutate the props object and not create a new one
         */
        const originalValue = value;
        // This needs to be a object with the [prop] so we can discover in transform arrays
        value = { [prop]: true };

        if (transformKeys.has(prop)) {
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
          delayedStyles.push(() => {
            if (getDeepPath(declarationTarget, prop) === value) {
              delete declarationTarget[prop];
              value = resolveDeclaration(originalValue, prop, get, {
                inlineVariables,
                inheritedVariables,
                renderGuards: guards,
                calculateProps,
                computingColor,
              });
              applyValue(declarationTarget, prop, value);
            }
          });
        }
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
    return value;
  }

  return resolveValue(
    unsetDescriptor(descriptor, prop, options.computingColor),
    get,
    options,
  );
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
