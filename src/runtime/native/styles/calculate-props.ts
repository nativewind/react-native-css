/* eslint-disable */
import type {
  InlineVariable,
  StyleDeclaration,
  StyleRule,
} from "../../../compiler";
import { applyValue, Specificity as S } from "../../utils";
import type { RenderGuard } from "../conditions/guards";
import {
  VAR_SYMBOL,
  type Getter,
  type VariableContextValue,
} from "../reactivity";
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
        guards,
        target,
        topLevelTarget,
      );
    }
  }

  for (const delayedStyle of delayedStyles) {
    delayedStyle();
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
  guards: RenderGuard[] = [],
  target: Record<string, any> = {},
  topLevelTarget = target,
) {
  for (const declaration of declarations) {
    if (!Array.isArray(declaration)) {
      // Static styles
      Object.assign(target, declaration);
    } else {
      // Dynamic styles
      let value: any = declaration[0];
      let propPath = declaration[1];
      let prop = "";

      if (typeof propPath === "string") {
        if (propPath.startsWith("^")) {
          propPath = propPath.slice(1);
          target = topLevelTarget[propPath] ??= {};
        }
        prop = propPath;
      } else {
        for (prop of propPath) {
          if (prop.startsWith("^")) {
            prop = prop.slice(1);
            target = topLevelTarget[prop] ??= {};
          } else {
            target = target[prop] ??= {};
          }
        }
      }

      if (Array.isArray(value)) {
        const shouldDelay = declaration[2];

        if (shouldDelay) {
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
          value = {};
          delayedStyles.push(() => {
            if (target[prop] === value) {
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
}
