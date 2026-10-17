/* eslint-disable */
import type {
  InlineVariable,
  StyleDeclaration,
  StyleRule,
} from "react-native-css/compiler";
import { Specificity as S } from "react-native-css/utilities";

import type { RenderGuard } from "../conditions/guards";
import { applyValue } from "../objects";
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

  const transformStyles: (() => void)[] = [];

  // css-variables-1 §3: a var() substitutes the element's computed custom property, so every rule's variables are assigned before any declaration resolves
  for (const rule of rules) {
    if (VAR_SYMBOL in rule) {
      if (typeof rule[VAR_SYMBOL] === "string") {
        Object.assign(inlineVariables, rule);
      } else {
        Object.assign(inheritedVariables, rule);
      }
    } else if (rule.v) {
      for (const variable of rule.v) {
        inlineVariables[variable[0]] = variable[1];
      }
    }
  }

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
    // Each declaration's own binding, since its transform closure runs after the walk has moved on
    let declarationTarget = target;

    if (!Array.isArray(declaration)) {
      // Static styles
      Object.assign(declarationTarget, declaration);
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
        // An object keyed by the prop lets the transform array find this entry
        value = { [prop]: true };

        transformStyles.push(() => {
          value = resolveValue(originalValue, get, {
            inlineVariables,
            inheritedVariables,
            renderGuards: guards,
            calculateProps,
          });
          applyValue(declarationTarget, prop, value);
        });

        applyValue(declarationTarget, prop, value);
      } else {
        value = resolveValue(value, get, {
          inlineVariables,
          inheritedVariables,
          renderGuards: guards,
          calculateProps,
        });

        // A runtime value that resolves to nothing removes the property, as css-variables-1 §3.1 resets one a var() leaves without a value
        if (value === undefined && declaration[2]) {
          delete declarationTarget[prop];
        } else {
          applyValue(declarationTarget, prop, value);
        }
      }
    }
  }
}
