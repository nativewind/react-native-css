/* eslint-disable */
import type { InlineVariable, StyleRule } from "../../../compiler";
import {
  applyValue,
  Specificity as S,
  specificityCompareFn,
} from "../../utils";
import type { RenderGuard } from "../conditions/guards";
import { getInteractionHandler } from "../react/interaction";
import type { ComponentState, Config } from "../react/useNativeCss";
import {
  activeFamily,
  containerLayoutFamily,
  family,
  focusFamily,
  hoverFamily,
  observable,
  VAR_SYMBOL,
  type Effect,
  type Getter,
  type VariableContextValue,
} from "../reactivity";
import { resolveValue } from "./resolve";

export const stylesFamily = family(
  (
    hash: string,
    rules: Set<StyleRule | InlineVariable | VariableContextValue>,
  ) => {
    const sortedRules = Array.from(rules).sort(specificityCompareFn);

    const obs = observable((read) => calculateProps(read, sortedRules));

    /**
     * A family is a map, so we need to cleanup the observers when the the hash is no longer used
     */
    return Object.assign(obs, {
      cleanup: (effect: Effect) => {
        obs.observers.delete(effect);
        if (obs.observers.size === 0) {
          stylesFamily.delete(hash);
        }
      },
    });
  },
);

function calculateProps(
  get: Getter,
  rules: Array<StyleRule | InlineVariable | VariableContextValue>,
) {
  let normal: Record<string, any> | undefined;
  let important: Record<string, any> | undefined;

  const delayedStyles: (() => void)[] = [];

  const guards: RenderGuard[] = [];

  const inheritedVariables: VariableContextValue = {
    [VAR_SYMBOL]: true,
  };

  const inlineVariables: InlineVariable = {
    [VAR_SYMBOL]: "inline",
  };

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

      for (const declaration of rule.d) {
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
                  });
                  applyValue(target, prop, value);
                }
              });
            } else {
              value = resolveValue(value, get, {
                inlineVariables,
                inheritedVariables,
                renderGuards: guards,
              });
            }

            applyValue(target, prop, value);
          }
        }
      }
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

export function getStyledProps(
  state: ComponentState,
  inline: Record<string, any> | undefined | null,
) {
  let result: Record<string, any> | undefined;

  const styledProps = state.stylesObs?.get(state.styleEffect);

  for (const config of state.configs) {
    result = deepMergeConfig(config, styledProps?.normal, inline, true);

    if (styledProps?.important) {
      result = deepMergeConfig(config, result, styledProps.important);
    }

    // Apply the handlers
    if (hoverFamily.has(state.ruleEffect)) {
      result ??= {};
      result.onHoverIn = getInteractionHandler(
        state.ruleEffect,
        "onHoverIn",
        inline?.onHoverIn,
      );
      result.onHoverOut = getInteractionHandler(
        state.ruleEffect,
        "onHoverOut",
        inline?.onHoverOut,
      );
    }

    if (activeFamily.has(state.ruleEffect)) {
      result ??= {};
      result.onPress = getInteractionHandler(
        state.ruleEffect,
        "onPress",
        inline?.onPress,
      );
      result.onPressIn = getInteractionHandler(
        state.ruleEffect,
        "onPressIn",
        inline?.onPressIn,
      );
      result.onPressOut = getInteractionHandler(
        state.ruleEffect,
        "onPressOut",
        inline?.onPressOut,
      );
    }

    if (focusFamily.has(state.ruleEffect)) {
      result ??= {};
      result.onBlur = getInteractionHandler(
        state.ruleEffect,
        "onBlur",
        inline?.onBlur,
      );
      result.onFocus = getInteractionHandler(
        state.ruleEffect,
        "onFocus",
        inline?.onFocus,
      );
    }

    if (containerLayoutFamily.has(state.ruleEffect)) {
      result ??= {};
      result.onLayout = getInteractionHandler(
        state.ruleEffect,
        "onLayout",
        inline?.onLayout,
      );
    }
  }

  return result;
}

function deepMergeConfig(
  config: Config,
  left: Record<string, any> | undefined,
  right: Record<string, any> | undefined | null,
  rightIsInline = false,
) {
  if (!config.target || !right) {
    return { ...left };
  }

  let result = Object.assign({}, left, right);

  if (
    right &&
    rightIsInline &&
    config.source in right &&
    config.target !== config.source
  ) {
    delete result[config.source];
  }

  /**
   *  If target is a path, deep merge until we get to the last key
   */
  if (Array.isArray(config.target) && config.target.length > 1) {
    for (let i = 0; i < config.target.length - 1; i++) {
      const key = config.target[i];

      if (key === undefined) {
        return result;
      }

      result[key] = deepMergeConfig(
        { source: config.source, target: config.target.slice(i + 1) },
        left?.[key],
        right?.[key],
        rightIsInline,
      );
    }

    return result;
  }

  const target = Array.isArray(config.target)
    ? config.target[0]
    : config.target;

  if (target === undefined) {
    return result;
  }

  let rightValue = right?.[target];

  // Strip any inline variables from the target
  if (rightIsInline && rightValue) {
    if (Array.isArray(rightValue)) {
      rightValue = rightValue.filter((v) => {
        return typeof v !== "object" || !(v && VAR_SYMBOL in v);
      });

      if (rightValue.length === 0) {
        rightValue = undefined;
      }
    } else if (
      typeof rightValue === "object" &&
      rightValue &&
      VAR_SYMBOL in rightValue
    ) {
      rightValue = undefined;
      delete result[target][VAR_SYMBOL];
    }
  }

  if (rightValue !== undefined) {
    result[target] =
      left && target in left ? [left[target], rightValue] : rightValue;
  }

  return result;
}
