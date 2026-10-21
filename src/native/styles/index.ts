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
 * Removes the CSS variable objects (with VAR_SYMBOL) an inline value holds, and an object's `undefined` keys, so
 * neither reaches a React Native prop; a style array keeps its `null` and `undefined` layers, which React Native
 * skips. A value that holds neither comes back as it came, an empty one included, so an inline style keeps its
 * identity and a class instance in it, such as an Animated value, is never rebuilt; one that held some comes back
 * rebuilt without them, and `undefined` once nothing is left. Only data properties are read, so an accessor, such as
 * a Reanimated shared value's `value`, never runs.
 *
 * @example
 * filterCssVariables({fontSize: 16, color: {[VAR_SYMBOL]: true}}) // {fontSize: 16}
 * filterCssVariables([{margin: 10}, {[VAR_SYMBOL]: true}, null]) // [{margin: 10}, null]
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

  for (let index = 0; index < array.length; index++) {
    const item = array[index];
    const kept = filterCssVariables(item, depth + 1);
    // A layer that filtered to nothing leaves, and an undefined layer as written stays
    const leaves = kept === undefined && item !== undefined;
    if (filtered === undefined) {
      if (!leaves && Object.is(kept, item)) {
        continue;
      }
      filtered = array.slice(0, index);
    }
    if (!leaves) {
      filtered.push(kept);
    }
  }

  if (filtered === undefined) {
    return array;
  }
  return filtered.length > 0 ? filtered : undefined;
}

function filterCssVariableObject(
  object: Readonly<Record<string, unknown>>,
  depth: number,
): unknown {
  const keys = Object.keys(object);
  let filtered: Record<string, unknown> | undefined;

  let seen = 0;
  for (const key of keys) {
    const index = seen++;
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    const value: unknown = descriptor?.value;
    const kept =
      descriptor === undefined || !("value" in descriptor)
        ? value
        : filterCssVariables(value, depth + 1);
    const isAccessor = descriptor !== undefined && !("value" in descriptor);
    const leaves = !isAccessor && kept === undefined;
    if (filtered === undefined) {
      if (isAccessor || (!leaves && Object.is(kept, value))) {
        continue;
      }
      filtered = {};
      for (const earlier of keys.slice(0, index)) {
        const earlierDescriptor = Object.getOwnPropertyDescriptor(
          object,
          earlier,
        );
        if (earlierDescriptor !== undefined) {
          Object.defineProperty(filtered, earlier, earlierDescriptor);
        }
      }
    }
    if (isAccessor) {
      Object.defineProperty(filtered, key, descriptor);
    } else if (!leaves) {
      filtered[key] = kept;
    }
  }

  if (filtered === undefined) {
    return object;
  }
  return Object.keys(filtered).length > 0 ? filtered : undefined;
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
      styledProps?.important &&
        nativeStyleMapping(config, adaptProps(styledProps.important)),
    );

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
 * allocation on a hot path (called per-prop per-render). A config's target adds nothing
 * for an empty object the same way, through `addsStyle`.
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

function isStyleObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A falsy style, an empty style array and an empty style object, such as contentContainerStyle={{}}, add nothing to a style prop
function addsStyle(value: unknown): boolean {
  if (value === undefined || value === null || value === false) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (isStyleObject(value)) {
    for (const _ in value) {
      return true;
    }
    return false;
  }
  return true;
}

// A later style object that sets every key of an earlier one hides it, as React Native's flattening would
function hides(later: unknown, earlier: unknown): boolean {
  return (
    isStyleObject(later) &&
    isStyleObject(earlier) &&
    !hasNonOverlappingProperties(earlier, later)
  );
}

// Pressable calls a function style with its state, so a style prop holding one stays a function
function composeStyleCallback(
  computed: unknown,
  inline: unknown,
  important: unknown,
): StyleCallback {
  return (state) =>
    [computed, inline, important]
      .filter(addsStyle)
      .map((layer) => (isStyleCallback(layer) ? layer(state) : layer));
}

// Both values come from this library, so they flatten into one object, which no caller holds
function combineComputedStyles(computed: unknown, important: unknown): unknown {
  if (!addsStyle(important)) {
    return computed;
  }
  if (!addsStyle(computed) || hides(important, computed)) {
    return important;
  }
  return flattenStyleArray(
    Array.isArray(computed)
      ? [...(computed as readonly unknown[]), important]
      : [computed, important],
  );
}

/**
 * Combines a style prop's three values in the cascade's order: the class's, the element's inline value, then the
 * class's `!important` declarations ([CSS Cascade 5 §6.1](https://www.w3.org/TR/css-cascade-5/#cascade-sort)).
 * The inline value is layered and never copied, so it keeps its identity, such as an animated style's; a value that
 * the next one hides is left out.
 */
function combineStyleLayers(
  computed: unknown,
  inline: unknown,
  important: unknown,
): unknown {
  const addsComputed = addsStyle(computed);
  const addsInline = addsStyle(inline);
  const addsImportant = addsStyle(important);

  if (!addsInline || (addsImportant && hides(important, inline))) {
    return combineComputedStyles(computed, important);
  }

  if (
    (addsComputed && isStyleCallback(computed)) ||
    isStyleCallback(inline) ||
    (addsImportant && isStyleCallback(important))
  ) {
    return addsComputed || addsImportant
      ? composeStyleCallback(computed, inline, important)
      : inline;
  }

  const below = addsComputed && !hides(inline, computed) ? computed : undefined;
  if (below === undefined) {
    return addsImportant ? [inline, important] : inline;
  }
  return addsImportant ? [below, inline, important] : [below, inline];
}

/**
 * Merges a config's computed props with the element's inline props and the class's `!important` ones. Every prop
 * takes the inline value over the computed one, and an `!important` one over both; the config's target, whichever
 * way the mapping spells it, combines its three values as a style prop, through every object on its path.
 */
function deepMergeConfig(
  config: Config,
  normal: Readonly<Record<string, unknown>> | undefined,
  inline: Readonly<Record<string, unknown>> | undefined | null,
  important: Readonly<Record<string, unknown>> | undefined,
): Record<string, unknown> {
  const result: Record<string, unknown> = mergeDefinedProps(
    normal,
    inline ?? {},
  );

  if (inline && config.source in inline && config.target !== config.source) {
    Reflect.deleteProperty(result, config.source);
  }

  const target = config.target;
  if (target === undefined || target === false) {
    return important ? mergeDefinedProps(result, important) : result;
  }

  combineAtPath(result, target, 0, normal, inline ?? undefined, important);
  return result;
}

function propsAt(
  props: Readonly<Record<string, unknown>> | undefined,
  key: string,
): Readonly<Record<string, unknown>> | undefined {
  const value = props?.[key];
  return isStyleObject(value) ? value : undefined;
}

// A target is a key or a path of keys, read by index: Babel compiles a destructured path to a helper call and a copy on every render
function combineAtPath(
  container: Record<string, unknown>,
  target: string | readonly string[],
  depth: number,
  normal: Readonly<Record<string, unknown>> | undefined,
  inline: Readonly<Record<string, unknown>> | undefined,
  important: Readonly<Record<string, unknown>> | undefined,
): void {
  const key = typeof target === "string" ? target : target[depth];
  if (key === undefined) {
    return;
  }

  if (typeof target === "string" || depth === target.length - 1) {
    const combined = combineStyleLayers(
      normal?.[key],
      filterCssVariables(inline?.[key]),
      important?.[key],
    );
    if (combined === undefined) {
      Reflect.deleteProperty(container, key);
    } else {
      container[key] = combined;
    }
    return;
  }

  const next = mergeDefinedProps(
    propsAt(normal, key),
    propsAt(inline, key) ?? {},
  );
  combineAtPath(
    next,
    target,
    depth + 1,
    propsAt(normal, key),
    propsAt(inline, key),
    propsAt(important, key),
  );
  container[key] = next;
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
