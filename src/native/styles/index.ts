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
 * Recursively filters out CSS variable objects (with VAR_SYMBOL) from style values.
 * This prevents CSS variable runtime objects from leaking into React Native component props.
 *
 * @param value - The value to filter (can be any type: object, array, primitive, etc.)
 * @param depth - Internal recursion depth counter to prevent stack overflow (max 100)
 * @returns The value with CSS variables removed, or `undefined` if the entire value should be filtered out
 *
 * Filtering behavior:
 * - Objects with VAR_SYMBOL property: returns `undefined` (completely filtered)
 * - A value holding no CSS variable comes back as the same object, uncopied, so an animated style keeps its identity
 * - A value holding some comes back copied without them, or `undefined` if nothing remains
 * - Class instances (e.g. an Animated.Value) and primitives: returned as-is
 * - A top-level style object with no string keys (`{}`, or only Symbol keys): returns `undefined`
 *
 * @example
 * filterCssVariables({fontSize: 16, color: {[VAR_SYMBOL]: true}}) // {fontSize: 16}
 * filterCssVariables([{margin: 10}, {[VAR_SYMBOL]: true}]) // [{margin: 10}]
 * filterCssVariables({color: {[VAR_SYMBOL]: true}}) // undefined (all props filtered)
 */
function filterCssVariables(value: any, depth = 0): any | undefined {
  // Prevent stack overflow on deeply nested structures
  if (depth > 100 || typeof value !== "object" || value === null) {
    return value;
  }

  // If the object itself has VAR_SYMBOL, filter it out (check own property only)
  if (Object.prototype.hasOwnProperty.call(value, VAR_SYMBOL)) {
    return undefined;
  }

  // Nothing is copied until a CSS variable is found, so an inline style keeps its identity, as an animated style's handle needs
  if (Array.isArray(value)) {
    let filtered: any[] | undefined;
    for (let index = 0; index < value.length; index++) {
      const item = value[index];
      const kept = filterCssVariables(item, depth + 1);
      if (filtered === undefined) {
        if (kept === item) continue;
        filtered = value.slice(0, index);
      }
      if (kept !== undefined) filtered.push(kept);
    }
    if (filtered === undefined) return value;
    return filtered.length > 0 ? filtered : undefined;
  }

  // A class instance, such as an Animated.Value, passes as it is: a plain copy detaches it from its animation
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  // Object.keys only iterates own string properties, so Symbol properties are left out of a copy
  const keys = Object.keys(value);
  let filtered: Record<string, any> | undefined;
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index] as string;
    const item = value[key];
    const kept = filterCssVariables(item, depth + 1);
    if (filtered === undefined) {
      if (kept === item) continue;
      filtered = {};
      for (let earlier = 0; earlier < index; earlier++) {
        const earlierKey = keys[earlier] as string;
        filtered[earlierKey] = value[earlierKey];
      }
    }
    if (kept !== undefined) filtered[key] = kept;
  }
  // A style object with no string keys, such as {}, adds nothing, as before
  if (filtered === undefined)
    return depth === 0 && keys.length === 0 ? undefined : value;
  for (const _ in filtered) return filtered;
  return undefined;
}

export const stylesFamily = family(
  (
    hash: number,
    rules: Set<StyleRule | InlineVariable | VariableContextValue>,
  ) => {
    const sortedRules = Array.from(rules).sort(specificityCompareFn);

    const obs = observable((read) => calculateProps(read, sortedRules));

    /**
     * A family is a map, so we need to cleanup the observers when the the hash is no longer used
     */
    const unsubscribe = obs.unsubscribe;
    return Object.assign(obs, {
      unsubscribe: (effect: Effect) => {
        unsubscribe(effect);
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
  adaptProps: (
    props: Record<string, any> | undefined,
  ) => Record<string, any> | undefined = (props) => props,
) {
  let result: Record<string, any> | undefined;

  const styledProps = state.stylesObs?.get(state.styleEffect);

  // Each config merges a complete props object. Preserve its full target path
  // before the next config merges unrelated inline props over that object.
  const computedTargets: { path: string[]; value: unknown }[] = [];
  const consumedSources: string[] = [];

  for (const config of state.configs) {
    result = deepMergeConfig(
      config,
      nativeStyleMapping(config, adaptProps(styledProps?.normal)),
      inline,
      true,
    );

    if (styledProps?.important) {
      result = deepMergeConfig(
        config,
        result,
        nativeStyleMapping(config, adaptProps(styledProps.important)),
      );
    }

    if (result && config.target) {
      const path = Array.isArray(config.target)
        ? config.target
        : [config.target];
      let target = result;
      for (const key of path.slice(0, -1)) target = target?.[key];
      const key = path[path.length - 1];
      if (target && key && key in target) {
        computedTargets.push({ path, value: target[key] });
      }
    }

    // Track consumed className sources for cleanup
    if (config.source !== config.target) {
      consumedSources.push(config.source);
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

  // Restore correctly-merged target props that may have been overwritten
  // by later config iterations' Object.assign({}, left, right)
  if (result) {
    for (const { path, value } of computedTargets) {
      let target = result;
      for (const key of path.slice(0, -1)) {
        const existing = target[key];
        target = target[key] = Array.isArray(existing)
          ? [...existing]
          : { ...existing };
      }
      target[path[path.length - 1]!] = value;
    }
    for (const source of consumedSources) {
      delete result[source];
    }
  }

  return result;
}

/**
 * Merges two prop objects, skipping keys from `right` whose value is `undefined`
 * or an empty plain object.
 *
 * `Object.assign({}, left, right)` copies all enumerable own properties from `right`,
 * including those with value `undefined` or `{}`. When a component passes
 * `style={undefined}` or `contentContainerStyle={{}}`, the computed NativeWind
 * style from `left` gets overwritten. This function prevents that by only copying
 * values that carry meaningful style information.
 *
 * Empty object detection uses inline `for...in` instead of a separate function or
 * `Object.keys().length` — avoids both function call overhead and intermediate array
 * allocation on a hot path (called per-prop per-render). Consistent with how the
 * `["style"]` target path handles this via `filterCssVariables({})` returning `undefined`.
 *
 * @param left - The computed NativeWind props (className-derived styles)
 * @param right - The inline props from the component (guaranteed non-null by caller; may contain undefined values)
 * @returns A new object with all properties from `left`, overridden only by meaningful values from `right`
 */
function mergeDefinedProps(
  left: Record<string, any> | undefined,
  right: Record<string, any>,
) {
  const result = left ? { ...left } : {};
  for (const key in right) {
    const value = right[key];
    if (value === undefined) continue;
    // Non-object values (strings, numbers, booleans, null, arrays): always assign
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      result[key] = value;
      continue;
    }
    // Plain object: assign only if non-empty. An empty style object (e.g.,
    // contentContainerStyle={{}}) has no properties to apply and should not
    // overwrite computed className styles. The for...in loop only executes
    // if the object has enumerable keys — empty objects are skipped.
    for (const _ in value) {
      result[key] = value;
      break;
    }
  }
  return result;
}

type StyleCallback = (state: unknown) => unknown;

function isStyleCallback(value: unknown): value is StyleCallback {
  return typeof value === "function";
}

// Pressable calls a function style with its pressed state, so a merge keeps a callback a callback
function composeStyleCallback(left: unknown, right: unknown): StyleCallback {
  return (state) => [
    isStyleCallback(left) ? left(state) : left,
    isStyleCallback(right) ? right(state) : right,
  ];
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
      } else if (!rightIsInline && right?.style) {
        // Merging non-inline styles (e.g., important styles)
        if (left?.style) {
          if (isStyleCallback(left.style) || isStyleCallback(right.style)) {
            result.style = composeStyleCallback(left.style, right.style);
          } else if (
            typeof left.style === "object" &&
            !Array.isArray(left.style) &&
            typeof right.style === "object" &&
            !hasNonOverlappingProperties(left.style, right.style)
          ) {
            // All left properties are overridden by right
            result.style = right.style;
          } else {
            // Layered rather than flattened: a copy would merge an inline animated style's handle into a plain object
            result.style = Array.isArray(left.style)
              ? [...left.style, right.style]
              : [left.style, right.style];
          }
        }
      }
    } else {
      result = mergeDefinedProps(left, right);
    }
  } else {
    result = mergeDefinedProps(left, right);
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
    if (config.target.length > 1) {
      const key = config.target[0]!;
      result[key] = deepMergeConfig(
        { source: config.source, target: config.target.slice(1) },
        left?.[key],
        right?.[key],
        rightIsInline,
      );
    }

    // For length-1 array targets (e.g. ["contentContainerStyle"]), the loop
    // above runs 0 iterations. Merge the target prop so inline styles don't
    // silently overwrite className-computed styles (same as string target path).
    const finalKey = config.target[config.target.length - 1];
    if (config.target.length === 1 && finalKey && rightIsInline) {
      let rightValue = right?.[finalKey];
      if (rightValue !== undefined) {
        rightValue = filterCssVariables(rightValue);
      }
      if (rightValue === undefined || rightValue === null) {
        // Inline is empty or fully filtered — preserve className-computed value
        if (left && finalKey in left) {
          result[finalKey] = left[finalKey];
        } else {
          // No left value either — remove unfiltered inline value from result
          delete result[finalKey];
        }
      } else if (left && finalKey in left) {
        const leftValue = left[finalKey];
        const leftIsObj =
          typeof leftValue === "object" &&
          leftValue !== null &&
          !Array.isArray(leftValue);
        const rightIsObj =
          typeof rightValue === "object" &&
          rightValue !== null &&
          !Array.isArray(rightValue);
        if (isStyleCallback(leftValue) || isStyleCallback(rightValue)) {
          result[finalKey] = composeStyleCallback(leftValue, rightValue);
        } else if (leftIsObj && rightIsObj) {
          if (hasNonOverlappingProperties(leftValue, rightValue)) {
            result[finalKey] = [leftValue, rightValue];
          } else {
            // All left keys are in right — use filtered right value
            result[finalKey] = rightValue;
          }
        } else {
          result[finalKey] = [leftValue, rightValue];
        }
      } else {
        // No left value — use filtered right value (not the unfiltered one from mergeDefinedProps)
        result[finalKey] = rightValue;
      }
    } else if (
      config.target.length === 1 &&
      finalKey &&
      finalKey !== "style" &&
      left?.[finalKey] !== undefined &&
      right[finalKey] !== undefined
    ) {
      // An !important value layers over the class's and the inline value rather than replacing both
      const leftValue = left[finalKey];
      const rightValue = right[finalKey];
      result[finalKey] =
        isStyleCallback(leftValue) || isStyleCallback(rightValue)
          ? composeStyleCallback(leftValue, rightValue)
          : [leftValue, rightValue];
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

  if (rightValue === undefined && rightIsInline && target in right) {
    // An inline value that held only CSS variables leaves the class's, and never reaches the component itself
    if (left && target in left) {
      result[target] = left[target];
    } else {
      delete result[target];
    }
  } else if (rightValue !== undefined) {
    if (left && target in left) {
      result[target] =
        isStyleCallback(left[target]) || isStyleCallback(rightValue)
          ? composeStyleCallback(left[target], rightValue)
          : [left[target], rightValue];
    } else {
      result[target] = rightValue;
    }
  }

  return result;
}

function nativeStyleMapping(
  config: Config,
  props: Record<string, any> | undefined,
) {
  if (!props) {
    return props;
  }
  if (!config.nativeStyleMapping) {
    if (config.target === false) delete props.style;
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

  if (config.target === false) delete props.style;
  return props;
}
