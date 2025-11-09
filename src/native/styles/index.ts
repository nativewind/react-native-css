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
 * Checks if the left style object has any properties that are not present in the right style object.
 * This is used to determine if styles need to be preserved in an array or if right can completely override left.
 *
 * Note: This intentionally only checks one direction (left → right). We don't need to check if right has
 * properties that left doesn't have, because right will always be applied/merged. The question we're
 * answering is: "Does left have any properties that would be lost if we just used right?" If yes, we
 * create a style array [left, right] to preserve both. If no, right can safely replace left entirely.
 *
 * @param left - The left style object to check
 * @param right - The right style object to compare against
 * @returns true if left has at least one property key that doesn't exist in right, false otherwise
 *
 * @example
 * hasNonOverlappingProperties({color: 'red', fontSize: 12}, {color: 'blue'}) // true - fontSize is not in right
 * hasNonOverlappingProperties({color: 'red'}, {color: 'blue', fontSize: 12}) // false - all left keys exist in right
 */
function hasNonOverlappingProperties(
  left: Record<string, any>,
  right: Record<string, any>,
): boolean {
  // Null safety check
  if (!left || !right) {
    return false;
  }

  // Only check own properties to avoid prototype pollution
  for (const key in left) {
    if (Object.prototype.hasOwnProperty.call(left, key)) {
      if (!Object.prototype.hasOwnProperty.call(right, key)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Flattens a style array into a single object when possible, with rightmost values taking precedence.
 * Returns the original array if it contains any non-plain objects, arrays, or CSS variable objects.
 *
 * Note: This function assumes the input array has already been filtered (e.g., by filterCssVariables),
 * so empty arrays should not reach this function. If they do, they will be treated as non-flattenable.
 *
 * @param styleArray - The style array to potentially flatten
 * @returns A single merged object if all items are plain objects, otherwise the original array
 */
function flattenStyleArray(styleArray: any[]): any {
  // Check if we can flatten to a single object (all items are plain objects)
  for (const item of styleArray) {
    // Use explicit null check instead of !item to allow falsy values like 0 or false
    if (
      item == null ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      Object.prototype.hasOwnProperty.call(item, VAR_SYMBOL)
    ) {
      return styleArray;
    }
  }

  // Use reduce to avoid spread operator performance issues with large arrays
  return styleArray.reduce((acc, item) => Object.assign(acc, item), {});
}

/**
 * Recursively filters out CSS variable objects (with VAR_SYMBOL) from style values.
 * This prevents CSS variable runtime objects from leaking into React Native component props.
 *
 * @param value - The value to filter (can be any type: object, array, primitive, etc.)
 * @param depth - Internal recursion depth counter to prevent stack overflow (max 100)
 * @returns The filtered value with CSS variables removed, or `undefined` if the entire value
 *          should be filtered out (e.g., empty arrays, objects with only VAR_SYMBOL properties)
 *
 * Filtering behavior:
 * - Objects with VAR_SYMBOL property: returns `undefined` (completely filtered)
 * - Arrays: filters out VAR_SYMBOL objects, returns `undefined` if empty after filtering
 * - Objects: recursively filters properties, returns `undefined` if no properties remain
 * - Primitives (null, undefined, numbers, strings, booleans): returned as-is
 * - Symbol properties: intentionally filtered out for React Native compatibility
 *
 * @example
 * filterCssVariables({fontSize: 16, color: {[VAR_SYMBOL]: true}}) // {fontSize: 16}
 * filterCssVariables([{margin: 10}, {[VAR_SYMBOL]: true}]) // [{margin: 10}]
 * filterCssVariables({color: {[VAR_SYMBOL]: true}}) // undefined (all props filtered)
 */
function filterCssVariables(value: any, depth = 0): any | undefined {
  // Prevent stack overflow on deeply nested structures
  if (depth > 100) {
    return value;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    // Single-pass filter with map operation
    const filtered: any[] = [];

    for (const item of value) {
      const filteredItem = filterCssVariables(item, depth + 1);
      if (
        filteredItem !== undefined &&
        !(
          typeof filteredItem === "object" &&
          filteredItem !== null &&
          Object.prototype.hasOwnProperty.call(filteredItem, VAR_SYMBOL)
        )
      ) {
        filtered.push(filteredItem);
      }
    }

    return filtered.length > 0 ? filtered : undefined;
  }

  if (typeof value === "object") {
    // If the object itself has VAR_SYMBOL, filter it out (check own property only)
    if (Object.prototype.hasOwnProperty.call(value, VAR_SYMBOL)) {
      return undefined;
    }

    // Otherwise, filter VAR_SYMBOL properties from nested objects
    const filtered: Record<string, any> = {};
    let hasProperties = false;

    // Use Object.keys to only iterate own string properties (not inherited, not Symbols)
    // This intentionally filters out Symbol properties for React Native compatibility
    for (const key of Object.keys(value)) {
      const filteredValue = filterCssVariables(value[key], depth + 1);
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
              if (hasNonOverlappingProperties(leftStyle, filteredRightStyle)) {
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
            if (hasNonOverlappingProperties(left.style, right.style)) {
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
    result = Object.assign({}, left, right);
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
