/* eslint-disable */
import type { InlineVariable, StyleRule } from "react-native-css/compiler";
import { StyleCollection } from "react-native-css/native-internal";

import { testRule } from "../conditions";
import { DEFAULT_CONTAINER_NAME } from "../conditions/container-query";
import type { RenderGuard } from "../conditions/guards";
import { getDeepPath } from "../objects";
import {
  activeFamily,
  containerLayoutFamily,
  focusFamily,
  hoverFamily,
  VAR_SYMBOL,
  weakFamily,
  type ContainerContextValue,
  type VariableContextValue,
} from "../reactivity";
import { stylesFamily } from "../styles";
import type { ComponentState, Config } from "./useNativeCss";

export const INLINE_RULE_SYMBOL = Symbol("react-native-css.inlineRule");

export function updateRules(
  state: ComponentState,
  // Either update the state with new props or use the current props
  currentProps = state.currentProps,
  inheritedVariables = state.inheritedVariables,
  inheritedContainers = state.inheritedContainers,
  forceUpdate = false,
  isRerender = true,
): ComponentState {
  const guards: RenderGuard[] = [];
  const rules = new Set<StyleRule | InlineVariable | VariableContextValue>();
  if (forceUpdate) {
    state = { ...state, guards, currentProps };
  }

  let usesVariables = false;

  let variables: VariableContextValue | undefined;
  let containers: ContainerContextValue | undefined;
  const inlineVariables = new Set<InlineVariable>();

  let animated = false;
  let pressable = false;

  for (const config of state.configs) {
    const source = currentProps?.[config.source];
    const shallowTarget = Array.isArray(config.target)
      ? config.target[0]
      : config.target;

    guards.push(["a", config.source, source]);
    if (shallowTarget) {
      guards.push(["a", shallowTarget, currentProps?.[shallowTarget]]);
    }

    const styleRuleSet = [];

    if (typeof source === "string") {
      const classNames = source.split(/\s+/);
      for (const className of classNames) {
        styleRuleSet.push(
          ...StyleCollection.styles(className).get(state.ruleEffect),
        );
      }
    }

    const target = getDeepPath(currentProps, config.target);
    if (target) {
      if (Array.isArray(target)) {
        for (const item of target) {
          // undefined or falsy is allowed in the style array
          if (!item) {
            continue;
          }

          if (VAR_SYMBOL in item) {
            inlineVariables.add(item);
          } else if (
            INLINE_RULE_SYMBOL in item &&
            typeof item[INLINE_RULE_SYMBOL] === "string"
          ) {
            pushInlineRule(state, item, styleRuleSet);
          }
        }
      } else if (
        config.target &&
        typeof target === "object" &&
        target &&
        VAR_SYMBOL in target
      ) {
        inlineVariables.add(target);
      } else if (
        INLINE_RULE_SYMBOL in target &&
        typeof target[INLINE_RULE_SYMBOL] === "string"
      ) {
        pushInlineRule(state, target, styleRuleSet);
      }
    }

    for (let rule of styleRuleSet) {
      usesVariables ||= Boolean(rule.dv);

      // We do this even if the rule doesn't match so we can maintain a consistent render tree
      // We we need to inject React context
      if (rule.a) animated = true;

      if (rule.v) {
        variables ??= inheritedVariables;
      }

      if (rule.c) {
        containers ??= inheritedContainers;
        activeFamily(state.ruleEffectGetter);
      }

      if (
        !testRule(
          rule,
          state.ruleEffectGetter,
          currentProps,
          guards,
          inheritedContainers,
        )
      ) {
        continue;
      }

      if (rule.v) {
        if (variables === inheritedVariables) {
          variables = { ...inheritedVariables };
        }

        for (const v of rule.v) {
          variables![v[0]] = v[1];
        }
      }

      if (rule.c) {
        // We're going to set a value, so we need to create a new object
        if (containers === inheritedContainers) {
          containers = {
            ...inheritedContainers,
            // This container becomes the default container
            [DEFAULT_CONTAINER_NAME]: state.ruleEffectGetter,
          };
        }

        // This this component as the named container
        for (const name of rule.c) {
          containers![name] = state.ruleEffectGetter;
        }

        // Enable hover/active/focus/layout handlers
        hoverFamily(state.ruleEffectGetter);
        activeFamily(state.ruleEffectGetter);
        focusFamily(state.ruleEffectGetter);
        containerLayoutFamily(state.ruleEffectGetter);
      }

      if (rule.a) {
        animated = true;
      }

      // Rules normally target style. If the target is not style, we need to create a new rule.
      if (config.target !== "style") {
        rule = getRuleVariation(rule)(config);
      }

      // Add the rule to the set and update the hash
      rules.add(rule);
    }

    if (process.env.NODE_ENV !== "production") {
      if (isRerender) {
        const pressable = activeFamily.has(state.ruleEffectGetter);

        if (Boolean(variables) !== Boolean(state.variables)) {
          console.log(
            `ReactNativeCss: className '${source}' added or removed a variable after the initial render. This causes the components state to be reset and all children be re-mounted. Use the className 'will-change-variable' to avoid this warning. If this was caused by sibling components being added/removed, use a 'key' prop so React can track the component correctly.`,
          );
        } else if (Boolean(containers) !== Boolean(state.containers)) {
          console.log(
            `ReactNativeCss: className '${source}' added or removed a container after the initial render. This causes the components state to be reset and all children be re-mounted. This will cause unexpected behavior. Use the className 'will-change-container' to avoid this warning. If this was caused by sibling components being added/removed, use a 'key' prop so React can track the component correctly.`,
          );
        } else if (animated !== state.animated) {
          console.log(
            `ReactNativeCss: className '${source}' added or removed an animation after the initial render. This causes the components state to be reset and all children be re-mounted. This will cause unexpected behavior. Use the className 'will-change-animation' to avoid this warning. If this was caused by sibling components being added/removed, use a 'key' prop so React can track the component correctly.`,
          );
        } else if (pressable !== state.pressable) {
          console.log(
            `ReactNativeCss: className '${source}' added or removed a pressable state after the initial render. This causes the components state to be reset and all children be re-mounted. This will cause unexpected behavior. Use the className 'will-change-pressable' to avoid this warning. If this was caused by sibling components being added/removed, use a 'key' prop so React can track the component correctly.`,
          );
        }
      }
    }
  }

  pressable = activeFamily.has(state.ruleEffectGetter);

  if (!rules.size && !state.stylesObs && !inlineVariables.size) {
    return {
      ...state,
      currentProps,
      guards,
      animated,
      pressable,
      variables,
      containers,
    };
  }

  if (usesVariables || variables) {
    rules.add(inheritedVariables);

    if (inlineVariables.size) {
      variables = Object.assign(
        {},
        variables,
        inheritedVariables,
        ...Array.from(inlineVariables),
        { [VAR_SYMBOL]: true },
      );
    }

    for (const variable of inlineVariables) {
      rules.add(variable);
    }
  }

  // Generate a StyleObservable for this unique set of rules / variables
  const stylesObs = stylesFamily(generateStateHash(state, rules), rules);

  // Get the guards without subscribing to the observable
  // We will subscribe within the render using the StyleEffect
  guards.push(...stylesObs.get().guards);

  // If these are the same styles with no inline variables, we can skip the update
  if (state.stylesObs === stylesObs && !inlineVariables.size) {
    return state;
  }

  // Remove this component from the old observer
  state.stylesObs?.cleanup(state.ruleEffect);

  return {
    ...state,
    currentProps,
    stylesObs,
    variables,
    containers,
    guards,
    animated,
    pressable,
  };
}

/**
 * Create variations of a style rule based on the config.
 * Cache for reference equality.
 */
const getRuleVariation = weakFamily((rule: StyleRule) => {
  return weakFamily((config: Config): StyleRule => {
    return { ...rule, target: config.target };
  });
});

function pushInlineRule(
  state: ComponentState,
  item: any,
  styleRuleSet: StyleRule[],
) {
  for (const className of item[INLINE_RULE_SYMBOL].split(/\s+/)) {
    let inlineRuleSet = StyleCollection.styles(className).get(state.ruleEffect);

    for (let rule of inlineRuleSet) {
      styleRuleSet.push(rule);
    }
  }
}

/**
 * Get a unique number for a weak key.
 */
let hashKeyCount = 0;
const hashKeyFamily = weakFamily(() => hashKeyCount++);

export function generateStateHash(
  state: ComponentState,
  iterableKeys: Iterable<WeakKey>,
): string {
  // The config is always a key, so this never answers the empty string. That matters: the empty
  // string used to double as a no-keys sentinel here, which would have given two different states
  // one cache entry now that the key is a join rather than a digest.
  return generateHash([state.configs, ...iterableKeys]);
}

/**
 * Encode a set of weak keys as a cache key.
 *
 * This is an exact canonical encoding rather than a hash: it has no chance of collision, and it
 * must not be folded back into one. The value keys the resolved-style cache, where two different
 * key sets meeting on one string do not cost a cache miss — the second element renders the first
 * element's styles.
 *
 * Every member is encoded. A key skipped here would be erased from the value, so two key sets
 * differing only in the skipped member would collide — which is why `WeakKey` is load-bearing
 * rather than decorative, and why a value outside it fails at the `WeakMap` rather than passing
 * through.
 */
export function generateHash(keys: WeakKey[]): string {
  // A Float64Array rather than an array, because `.sort()` on a typed array is numeric and native.
  // `Array.prototype.sort` needs a comparator to order numbers, and that comparator is a JS
  // function Hermes calls O(n log n) times — measured on a physical device, it is the whole cost of
  // ordering here. Float64 rather than Int32 because the key counter is unbounded and Int32 wraps
  // silently at 2^31, which would turn two distinct key sets into one string.
  const numbers = new Float64Array(keys.length);
  let index = 0;

  for (const key of keys) {
    numbers[index] = hashKeyFamily(key);
    index += 1;
  }

  // Sorted, so a set of keys encodes the same however it was iterated. The
  // caller relies on that: the rule set is a Set built in render order.
  //
  // Joined rather than folded into a single number, so distinct key sets
  // cannot land on one string. This value keys the resolved-style cache, and
  // a collision there does not cost a cache miss — it hands one element
  // another element's styles.
  numbers.sort();

  return numbers.join(",");
}
