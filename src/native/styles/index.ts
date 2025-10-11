/* eslint-disable */
import type { InlineVariable, StyleRule } from "react-native-css/compiler";
import { specificityCompareFn } from "react-native-css/utilities";

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
  type VariableContextValue,
} from "../reactivity";
import { calculateProps } from "./calculate-props";

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

export function getStyledProps(
  state: ComponentState,
  inline: Record<string, any> | undefined | null,
) {
  let result: Record<string, any> | undefined;

  const styledProps = state.stylesObs?.get(state.styleEffect);

  for (const config of state.configs) {
    result = deepMergeConfig(
      config,
      nativeStyleMapping(config, styledProps?.normal),
      inline,
      true,
    );

    if (styledProps?.important) {
      result = deepMergeConfig(
        config,
        result,
        nativeStyleMapping(config, styledProps.important),
      );
    }

    // Apply the handlers
    if (hoverFamily.has(state.ruleEffectGetter)) {
      result ??= {};
      result.onHoverIn = getInteractionHandler(
        state.ruleEffectGetter,
        "onHoverIn",
        inline?.onHoverIn,
      );
      result.onHoverOut = getInteractionHandler(
        state.ruleEffectGetter,
        "onHoverOut",
        inline?.onHoverOut,
      );
    }

    if (activeFamily.has(state.ruleEffectGetter)) {
      result ??= {};
      result.onPress = getInteractionHandler(
        state.ruleEffectGetter,
        "onPress",
        inline?.onPress,
      );
      result.onPressIn = getInteractionHandler(
        state.ruleEffectGetter,
        "onPressIn",
        inline?.onPressIn,
      );
      result.onPressOut = getInteractionHandler(
        state.ruleEffectGetter,
        "onPressOut",
        inline?.onPressOut,
      );
    }

    if (focusFamily.has(state.ruleEffectGetter)) {
      result ??= {};
      result.onBlur = getInteractionHandler(
        state.ruleEffectGetter,
        "onBlur",
        inline?.onBlur,
      );
      result.onFocus = getInteractionHandler(
        state.ruleEffectGetter,
        "onFocus",
        inline?.onFocus,
      );
    }

    if (containerLayoutFamily.has(state.ruleEffectGetter)) {
      result ??= {};
      result.onLayout = getInteractionHandler(
        state.ruleEffectGetter,
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
  if (!right) {
    return { ...left };
  }

  let result = config.target ? Object.assign({}, left, right) : { ...left };

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
  if (Array.isArray(config.target)) {
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

  const target = config.target;

  if (target === undefined || target === false) {
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

function nativeStyleMapping(
  config: Config,
  props: Record<string, any> | undefined,
) {
  if (!config.nativeStyleMapping || !props) {
    return props;
  }

  let source: Record<string, any> | undefined;

  if (typeof config.target === "string") {
    source = props[config.target];
  } else if (config.target === false) {
    source = props["style"];
  } else {
    const tokens = [...config.target];
    const lastToken = tokens.pop()!;

    source = props;
    for (const token of tokens) {
      source = source[token];
      if (!source) {
        return props;
      }
    }

    source = source[lastToken];
  }

  if (!source) {
    return props;
  }

  for (const [key, path] of Object.entries(config.nativeStyleMapping)) {
    const styleValue = source[key];

    delete source[key];

    if (styleValue === undefined) {
      continue;
    }

    let target = props;
    const tokens = path.split(".");
    const lastToken = tokens.pop();
    for (const token of tokens) {
      target[token] ??= {};
      target = target[token];
    }

    target[lastToken!] = styleValue;
  }

  return props;
}
