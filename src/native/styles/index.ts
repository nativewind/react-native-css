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
 * Removes the CSS variable objects (with VAR_SYMBOL) an inline value holds, so none reaches a React Native prop.
 * A value that holds none comes back as it came, so an inline style keeps its identity and a class instance in it,
 * such as an Animated value, is never rebuilt; an array or plain object that held one, an `undefined` entry or a
 * Symbol key comes back rebuilt without it, and one left empty comes back `undefined`.
 *
 * @example
 * filterCssVariables({fontSize: 16, color: {[VAR_SYMBOL]: true}}) // {fontSize: 16}
 * filterCssVariables([{margin: 10}, {[VAR_SYMBOL]: true}]) // [{margin: 10}]
 * filterCssVariables({color: {[VAR_SYMBOL]: true}}) // undefined (all props filtered)
 */
function filterCssVariables(value: unknown, depth = 0): unknown {
  // Prevent stack overflow on deeply nested structures
  if (depth > 100 || typeof value !== "object" || value === null) {
    return value;
  }

  if (Object.prototype.hasOwnProperty.call(value, VAR_SYMBOL)) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return filterCssVariableArray(value as readonly unknown[], depth);
  }

  return isPlainObject(value)
    ? filterCssVariableObject(value as Readonly<Record<string, unknown>>, depth)
    : value;
}

function filterCssVariableArray(
  array: readonly unknown[],
  depth: number,
): unknown {
  let filtered: unknown[] | undefined;

  for (const [index, item] of array.entries()) {
    const kept = filterCssVariables(item, depth + 1);
    if (filtered === undefined) {
      if (kept === item && kept !== undefined) {
        continue;
      }
      filtered = array.slice(0, index);
    }
    if (kept !== undefined) {
      filtered.push(kept);
    }
  }

  const result = filtered ?? array;
  return result.length > 0 ? result : undefined;
}

function filterCssVariableObject(
  object: Readonly<Record<string, unknown>>,
  depth: number,
): unknown {
  const keys = Object.keys(object);
  let filtered: Record<string, unknown> | undefined =
    Object.getOwnPropertySymbols(object).length > 0 ? {} : undefined;

  for (const [index, key] of keys.entries()) {
    const value = object[key];
    const kept = filterCssVariables(value, depth + 1);
    if (filtered === undefined) {
      if (kept === value && kept !== undefined) {
        continue;
      }
      filtered = Object.fromEntries(
        keys.slice(0, index).map((earlier) => [earlier, object[earlier]]),
      );
    }
    if (kept !== undefined) {
      filtered[key] = kept;
    }
  }

  const result = filtered ?? object;
  return Object.keys(result).length > 0 ? result : undefined;
}

function isPlainObject(value: object): boolean {
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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

function isStyleObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// An inline style object can carry an identity a copy would lose (an animated style), so only computed values are flattened
type StyleLayering = "flattened" | "layered";

/** Combines two values of one style prop, `right` taking precedence */
function combineStyleValues(
  left: unknown,
  right: unknown,
  layering: StyleLayering,
): unknown {
  if (isStyleCallback(left) || isStyleCallback(right)) {
    return composeStyleCallback(left, right);
  }

  if (
    isStyleObject(left) &&
    isStyleObject(right) &&
    !hasNonOverlappingProperties(left, right)
  ) {
    return right;
  }

  switch (layering) {
    case "flattened":
      return flattenStyleArray(
        Array.isArray(left) ? [...left, right] : [left, right],
      );
    case "layered":
      return [left, right];
    default:
      return layering satisfies never;
  }
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
      } else if (!rightIsInline && right?.style && left?.style) {
        // Merging non-inline styles (e.g., important styles)
        result.style = combineStyleValues(left.style, right.style, "flattened");
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
        result[finalKey] = combineStyleValues(
          left[finalKey],
          rightValue,
          "layered",
        );
      } else {
        // No left value — use filtered right value (not the unfiltered one from mergeDefinedProps)
        result[finalKey] = rightValue;
      }
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
      left && target in left
        ? combineStyleValues(left[target], rightValue, "layered")
        : rightValue;
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
