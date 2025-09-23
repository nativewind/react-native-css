/* eslint-disable */
import type {
  InlineVariable,
  StyleDeclaration,
  StyleRule,
} from "react-native-css/compiler";
import { Specificity as S } from "react-native-css/utilities";

import type { RenderGuard } from "../conditions/guards";
import { applyValue, getDeepPath } from "../objects";
import {
  VAR_SYMBOL,
  type Getter,
  type VariableContextValue,
} from "../reactivity";
import { transformKeys } from "./defaults";
import { resolveValue } from "./resolve";

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
      for (const variable of rule.v) {
        inlineVariables[variable[0]] = variable[1];
      }
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
  const originalTarget = target;

  for (const declaration of declarations) {
    target = originalTarget;

    if (!Array.isArray(declaration)) {
      // Static styles
      Object.assign(target, declaration);
    } else {
      // Dynamic styles
      let value: any = declaration[0];
      let propPath = declaration[1];
      let prop: string | number;

      if (Array.isArray(propPath)) {
        const [first, ...rest] = propPath;

        if (!first) {
          continue;
        }

        const final = rest.pop();

        if (final) {
          if (first !== "&") {
            topLevelTarget[first] ??= {};
            target = topLevelTarget[first];
          }

          let previousProp: string | number = first;
          let previousTarget = topLevelTarget;

          for (prop of rest) {
            if (prop.startsWith("[") && prop.endsWith("]")) {
              prop = Number(prop.slice(1, -1));

              if (!Array.isArray(previousTarget[previousProp])) {
                previousTarget[previousProp] = [];
                target = previousTarget[previousProp];
              }
            }
            previousTarget = target;
            previousProp = prop;

            target[prop] ??= {};
            target = target[prop];
          }

          prop = final;
        } else {
          target = topLevelTarget;
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
            value = resolveValue(originalValue, get, {
              inlineVariables,
              inheritedVariables,
              renderGuards: guards,
              calculateProps,
            });
            applyValue(target, prop, value);
          });
        } else {
          delayedStyles.push(() => {
            if (getDeepPath(target, prop) === value) {
              delete target[prop];
              value = resolveValue(originalValue, get, {
                inlineVariables,
                inheritedVariables,
                renderGuards: guards,
                calculateProps,
              });
              applyValue(target, prop, value);
            }
          });
        }
      } else {
        value = resolveValue(value, get, {
          inlineVariables,
          inheritedVariables,
          renderGuards: guards,
          calculateProps,
        });
      }

      applyValue(target, prop, value);
    }
  }
}
