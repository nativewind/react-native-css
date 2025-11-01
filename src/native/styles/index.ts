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

/**
 * Flattens a style array into a single object, with rightmost values taking precedence
 */
function flattenStyleArray(styleArray: any[]): any {
  // Check if we can flatten to a single object (all items are plain objects)
  const allObjects = styleArray.every(
    (item) =>
      item &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      !(VAR_SYMBOL in item),
  );

  if (!allObjects) {
    return styleArray;
  }

  // Merge all objects with right-side precedence (later values override earlier ones)
  return Object.assign({}, ...styleArray);
}

/**
 * Recursively filters out CSS variable objects (with VAR_SYMBOL) from style values
 */
function filterCssVariables(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    const filtered = value
      .map((item) => filterCssVariables(item))
      .filter((item) => {
        // Remove undefined items (filtered out CSS variables)
        if (item === undefined) {
          return false;
        }
        // Remove items that are objects with VAR_SYMBOL
        if (typeof item === "object" && item !== null && VAR_SYMBOL in item) {
          return false;
        }
        return true;
      });
    return filtered.length > 0 ? filtered : undefined;
  }

  if (typeof value === "object") {
    // If the object itself has VAR_SYMBOL, filter it out
    if (VAR_SYMBOL in value) {
      return undefined;
    }

    // Otherwise, filter VAR_SYMBOL properties from nested objects
    const filtered: Record<string, any> = {};
    let hasProperties = false;

    for (const key in value) {
      const filteredValue = filterCssVariables(value[key]);
      if (filteredValue !== undefined) {
        filtered[key] = filteredValue;
        hasProperties = true;
      }
    }

    return hasProperties ? filtered : undefined;
  }

  return value;
}

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

  // Handle style merging to support both className and inline style props
  let result: Record<string, any>;
  if (config.target) {
    if (
      Array.isArray(config.target) &&
      config.target.length === 1 &&
      config.target[0] === "style"
    ) {
      // Special handling for style target when we have inline styles
      result = { ...left, ...right };

      // Handle null/undefined inline styles
      if (right?.style === null || right?.style === undefined) {
        if (left?.style) {
          result.style = left.style;
        }
      } else if (rightIsInline && right?.style) {
        // Filter inline styles if rightIsInline is true
        const filteredRightStyle = filterCssVariables(right.style);

        if (left?.style) {
          if (!filteredRightStyle) {
            // All inline styles were CSS variables, only use left
            result.style = left.style;
          } else {
            const leftStyle = left.style;

            // For arrays or objects, check if we need to create a style array
            const leftIsObject =
              typeof leftStyle === "object" && !Array.isArray(leftStyle);
            const rightIsObject =
              typeof filteredRightStyle === "object" &&
              !Array.isArray(filteredRightStyle);

            if (leftIsObject && rightIsObject) {
              // Quick check: do any left properties NOT exist in right?
              let hasNonOverlappingProperties = false;
              for (const key in leftStyle) {
                if (!(key in filteredRightStyle)) {
                  hasNonOverlappingProperties = true;
                  break; // Early exit for performance
                }
              }

              if (hasNonOverlappingProperties) {
                result.style = [leftStyle, filteredRightStyle];
              } else {
                // All left properties are in right, right overrides
                result.style = filteredRightStyle;
              }
            } else {
              // One or both are arrays, merge them
              result.style = [leftStyle, filteredRightStyle];
            }
          }
        } else {
          // No left style, just use filtered right
          if (filteredRightStyle) {
            result.style = filteredRightStyle;
          } else {
            // All filtered out, remove style prop
            delete result.style;
          }
        }
      } else if (!rightIsInline && right?.style) {
        // Merging non-inline styles (e.g., important styles)
        if (left?.style) {
          // If left.style is an array, append right.style
          if (Array.isArray(left.style)) {
            const combined = [...left.style, right.style];
            result.style = flattenStyleArray(combined);
          } else if (
            typeof left.style === "object" &&
            typeof right.style === "object"
          ) {
            // Both are objects, check for overlaps
            let hasNonOverlappingProperties = false;
            for (const key in left.style) {
              if (!(key in right.style)) {
                hasNonOverlappingProperties = true;
                break;
              }
            }
            if (hasNonOverlappingProperties) {
              result.style = flattenStyleArray([left.style, right.style]);
            } else {
              // All left properties are overridden by right
              result.style = right.style;
            }
          } else {
            // One or both are arrays/mixed types
            const combined = [left.style, right.style];
            result.style = flattenStyleArray(combined);
          }
        }
      }
    } else {
      result = Object.assign({}, left, right);
    }
  } else {
    result = { ...left };
  }

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
  if (rightIsInline && rightValue !== undefined) {
    rightValue = filterCssVariables(rightValue);
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
