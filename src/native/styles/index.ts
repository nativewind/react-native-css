/* eslint-disable */
import type { InlineVariable, StyleRule } from "react-native-css/compiler";
import { specificityCompareFn } from "react-native-css/utilities";

import {
  isNonArrayObject,
  isPlainObject,
  valueAtPath,
  withDeepPaths,
  withoutKeysAt,
} from "../objects";
import { collectionTarget, targetPath } from "../react/collection-target";
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
  weakFamily,
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
    props: Readonly<Record<string, unknown>>,
  ) => Readonly<Record<string, unknown>> = (props) => props,
) {
  let result: Record<string, any> | undefined;

  const styledProps = state.stylesObs?.get(state.styleEffect);

  // Each config merges a complete props object. Preserve its full target path
  // before the next config merges unrelated inline props over that object.
  const computedTargets: {
    readonly path: readonly string[];
    readonly value: unknown;
  }[] = [];
  const consumedSources: string[] = [];

  // The computed props are shared by every render, and every config is mapped before any merges, so each merge and each kept target sees every mapping
  const normal = mapEveryConfig(state.configs, adaptProps, styledProps?.normal);
  const important = mapEveryConfig(
    state.configs,
    adaptProps,
    styledProps?.important,
  );

  for (const config of state.configs) {
    result = deepMergeConfig(config, normal, inline, true);

    if (important && config.target) {
      result = deepMergeConfig(config, result, important);
    }

    if (result && config.target) {
      const path = targetPath(config.target);
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
      if (valueAtPath(result, path) === value) {
        continue;
      }
      let target = result;
      for (const key of path.slice(0, -1)) {
        const existing = target[key];
        target = target[key] = Array.isArray(existing)
          ? [...existing]
          : { ...existing };
      }
      target[path[path.length - 1]!] = value;
    }
    // The props object is this render's own, so its keys settle in place, and a container below it, which the computed props may share, is copied
    settleUnownedProps(
      result,
      writtenPropTreeFamily(state.configs),
      normal,
      inline ?? undefined,
      important,
      result,
    );
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
 * `suppliesValue` decides which values count, as the props no config owns settle too.
 * Consistent with how the `["style"]` target path handles this via
 * `filterCssVariables({})` returning `undefined`.
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
    if (suppliesValue(value)) {
      result[key] = value;
    }
  }
  return result;
}

// undefined and an empty style object, such as contentContainerStyle={{}}, supply nothing to merge over a computed value
function suppliesValue(value: unknown): boolean {
  if (value === undefined) {
    return false;
  }
  if (!isNonArrayObject(value)) {
    return true;
  }
  for (const _ in value) {
    return true;
  }
  return false;
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
      typeof config.target === "object" &&
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
            if (
              isNonArrayObject(leftStyle) &&
              isNonArrayObject(filteredRightStyle)
            ) {
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
  if (typeof config.target === "object") {
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
        if (isNonArrayObject(leftValue) && isNonArrayObject(rightValue)) {
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

function mapEveryConfig(
  configs: readonly Config[],
  adaptProps: (
    props: Readonly<Record<string, unknown>>,
  ) => Readonly<Record<string, unknown>>,
  props: Readonly<Record<string, unknown>> | undefined,
) {
  if (!props) {
    return props;
  }

  return mappedPropsFamily(configs)(adaptProps(props));
}

// Mapping builds new objects, so it runs once per configs and computed props, and a render that changes neither maps nothing again
const mappedPropsFamily = weakFamily((configs: readonly Config[]) => {
  const mappingConfigs = configs.filter(hasNativeStyleMapping);

  return mappingConfigs.length === 0
    ? (props: Readonly<Record<string, unknown>>) => props
    : weakFamily((props: Readonly<Record<string, unknown>>) =>
        nativeStyleMapping(mappingConfigs, props),
      );
});

type MappingConfig = Config & {
  readonly nativeStyleMapping: NonNullable<Config["nativeStyleMapping"]>;
};

function hasNativeStyleMapping(config: Config): config is MappingConfig {
  return config.nativeStyleMapping !== undefined;
}

// Every mapping reads the props as computed, and every mapped key leaves its source before any destination is written, so no mapping reads what another wrote
function nativeStyleMapping(
  configs: readonly MappingConfig[],
  props: Readonly<Record<string, unknown>>,
) {
  const sources = configs.flatMap((config) => {
    const sourcePath = targetPath(collectionTarget(config));
    const source = valueAtPath(props, sourcePath);
    return isNonArrayObject(source) ? [{ config, sourcePath, source }] : [];
  });

  const stripped = sources.reduce(
    (result, { config, sourcePath }) =>
      withoutKeysAt(result, sourcePath, Object.keys(config.nativeStyleMapping)),
    props,
  );

  return withDeepPaths(
    stripped,
    sources.flatMap(({ config, source }) =>
      Object.entries(config.nativeStyleMapping).flatMap(([key, path]) => {
        const value = source[key];
        return value === undefined ? [] : [[path.split("."), value] as const];
      }),
    ),
  );
}

interface WrittenPropTree {
  readonly owned: boolean;
  readonly holdsOwned: boolean;
  readonly children: ReadonlyMap<string, WrittenPropTree>;
}

interface WrittenPath {
  readonly path: readonly string[];
  readonly owned: boolean;
}

// The paths the configs write: each target, which its config owns, each source, which getStyledProps strips, and each mapping destination; a component keeps one configs array, so this runs once per component
const writtenPropTreeFamily = weakFamily(
  (configs: readonly Config[]): WrittenPropTree =>
    writtenPropTree([
      ...configs.flatMap((config): WrittenPath[] =>
        config.target === false
          ? [{ path: [config.source], owned: true }]
          : [
              { path: [config.source], owned: true },
              { path: targetPath(config.target), owned: true },
            ],
      ),
      ...configs.flatMap((config): WrittenPath[] =>
        Object.values(config.nativeStyleMapping ?? {}).map((destination) => ({
          path: destination.split("."),
          owned: false,
        })),
      ),
    ]),
);

function writtenPropTree(
  paths: readonly WrittenPath[],
  depth = 0,
): WrittenPropTree {
  const below = new Map<string, WrittenPath[]>();
  for (const written of paths) {
    const key = written.path[depth];
    if (key !== undefined) {
      below.set(key, [...(below.get(key) ?? []), written]);
    }
  }
  return {
    owned: paths.some(
      (written) => written.owned && written.path.length === depth,
    ),
    holdsOwned: paths.some((written) => written.owned),
    children: new Map(
      [...below].map(([key, keyPaths]) => [
        key,
        writtenPropTree(keyPaths, depth + 1),
      ]),
    ),
  };
}

// A prop no config owns settles the same way in any order of the configs: along a path the configs write it merges key by key, as main's merge does along a target's path, and a leaf takes its !important value, else its inline one, else its normal one, each whole
function settleUnownedProps(
  current: Readonly<Record<string, unknown>> | undefined,
  tree: WrittenPropTree,
  normal: Readonly<Record<string, unknown>> | undefined,
  inline: Readonly<Record<string, unknown>> | undefined,
  important: Readonly<Record<string, unknown>> | undefined,
  writeInto?: Record<string, unknown>,
): Readonly<Record<string, unknown>> | undefined {
  let settled = writeInto;
  if (normal !== undefined) {
    for (const key in normal) {
      settled = withSettledKey(
        settled,
        key,
        current,
        tree,
        normal,
        inline,
        important,
      );
    }
  }
  if (important !== undefined) {
    for (const key in important) {
      if (normal === undefined || !(key in normal)) {
        settled = withSettledKey(
          settled,
          key,
          current,
          tree,
          normal,
          inline,
          important,
        );
      }
    }
  }
  return settled ?? current;
}

// A settled object is copied on its first change only, so a render that settles nothing new allocates nothing
function withSettledKey(
  settled: Record<string, unknown> | undefined,
  key: string,
  current: Readonly<Record<string, unknown>> | undefined,
  tree: WrittenPropTree,
  normal: Readonly<Record<string, unknown>> | undefined,
  inline: Readonly<Record<string, unknown>> | undefined,
  important: Readonly<Record<string, unknown>> | undefined,
): Record<string, unknown> | undefined {
  const branch = tree.children.get(key);
  if (branch?.owned) {
    return settled;
  }
  const value =
    branch === undefined || branch.children.size === 0
      ? settledLeaf(normal?.[key], inline?.[key], important?.[key])
      : settledContainer(
          current?.[key],
          branch,
          normal?.[key],
          inline?.[key],
          important?.[key],
        );
  if (current !== undefined && key in current && current[key] === value) {
    return settled;
  }
  const target = settled ?? { ...current };
  target[key] = value;
  return target;
}

function settledLeaf(
  normal: unknown,
  inline: unknown,
  important: unknown,
): unknown {
  if (important !== undefined) {
    return important;
  }
  return suppliesValue(inline) ? inline : normal;
}

// An inline value that is no object replaces the normal value whole, as main's merge does, and an !important value replaces it
function settledContainer(
  current: unknown,
  branch: WrittenPropTree,
  normal: unknown,
  inline: unknown,
  important: unknown,
): unknown {
  if (inline !== undefined && !isPlainObject(inline)) {
    return important ?? inline;
  }
  if (important !== undefined && !isPlainObject(important)) {
    return important;
  }
  if (branch.holdsOwned) {
    return settleUnownedProps(
      isPlainObject(current) ? current : undefined,
      branch,
      isPlainObject(normal) ? normal : undefined,
      isPlainObject(inline) ? inline : undefined,
      isPlainObject(important) ? important : undefined,
    );
  }
  return settledMappedContainerFamily(branch)(valueKey(normal))(
    valueKey(inline),
  )(valueKey(important));
}

// A container only mappings write holds nothing a target restores, so it depends on its three values alone, and keeps its identity while they keep theirs
const NO_VALUE = Object.freeze({});

function valueKey(value: unknown): object {
  return isPlainObject(value) ? value : NO_VALUE;
}

function recordOf(key: object): Readonly<Record<string, unknown>> | undefined {
  return key === NO_VALUE || !isPlainObject(key) ? undefined : key;
}

const settledMappedContainerFamily = weakFamily((branch: WrittenPropTree) =>
  weakFamily((normal: object) =>
    weakFamily((inline: object) =>
      weakFamily((important: object) =>
        settleUnownedProps(
          recordOf(inline),
          branch,
          recordOf(normal),
          recordOf(inline),
          recordOf(important),
        ),
      ),
    ),
  ),
);
