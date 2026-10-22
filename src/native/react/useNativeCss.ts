/* eslint-disable */
import {
  createElement,
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { VariableContext } from "react-native-css/native-internal";

import type { StyledConfiguration } from "../../runtime.types";
import { testGuards, type RenderGuard } from "../conditions/guards";
import {
  cleanupEffect,
  ContainerContext,
  hasChangedDependencies,
  type ContainerContextValue,
  type Effect,
  type Getter,
  type VariableContextValue,
} from "../reactivity";
import { animatedComponentFamily } from "../reanimated";
import { getStyledProps, stylesFamily } from "../styles";
import { updateRules } from "./rules";

export type Config = {
  source: string;
  target: string[] | string | false;
  nativeStyleMapping?: Record<string, string> | undefined;
};

export type ComponentState = {
  /** The source/target for classNames */
  configs: Config[];

  /** Reactive tracking */
  ruleEffect: Effect;
  ruleEffectGetter: Getter;
  styleEffect: Effect;

  /** The components props */
  currentProps?: Record<string, any> | undefined | null;

  /** An observable of the normal/important props */
  stylesObs?: ReturnType<typeof stylesFamily>;
  guards?: RenderGuard[];

  variables?: VariableContextValue;
  containers?: ContainerContextValue;

  inheritedVariables: VariableContextValue;
  inheritedContainers: ContainerContextValue;

  animated?: boolean;
  pressable?: undefined | boolean;
};

/**
 * useNativeCss is the native implementation of the useCssElement hook.
 */
export function useNativeCss(
  type: ComponentType<any>,
  originalProps: Record<string, any> | undefined | null,
  configs: Config[] = [{ source: "className", target: "style" }],
) {
  const inheritedVariables = useContext(VariableContext);
  const inheritedContainers = useContext(ContainerContext);

  const [state, setState] = useState((): ComponentState => {
    /**
     * When fired, this effect will force the rules to be re-evaluated.
     * This will cause a re-render if there are different rules
     *
     * Use this when a rule condition changes, e.g FastRefresh or media queries
     */
    const ruleEffect: Effect = {
      observers: new Set(),
      run: () => setState((state) => updateRules(state)),
    };

    /**
     * When fired, this effect will force a re-render of the component.
     * This will cause a re-fetch of the styles.
     *
     * Use this when a value changes, e.g vm units or light / dark mode
     */
    const styleEffect: Effect = {
      observers: new Set(),
      run: () => setState((state) => ({ ...state })),
    };

    const initialState = updateRules(
      {
        ruleEffect,
        ruleEffectGetter: (observable) => observable.get(ruleEffect),
        styleEffect,
        configs,
        inheritedContainers,
        inheritedVariables,
        pressable: type === View ? false : undefined,
      },
      originalProps,
      inheritedVariables,
      inheritedContainers,
      false,
      false,
    );
    // State initializers may be discarded by React StrictMode. Subscribe once
    // the component commits instead of retaining an abandoned initializer.
    cleanupEffect(ruleEffect);
    return initialState;
  });

  // Distinguishes a fresh mount from an effect replay (Activity, StrictMode)
  const hasCommittedRef = useRef(false);

  useEffect(() => {
    // Reconnect subscriptions after React replays an effect setup.
    if (state.ruleEffect.observers.size === 0) {
      if (hasCommittedRef.current || hasChangedDependencies(state.ruleEffect)) {
        // Replay, or conditions changed since the initializer: recalculate.
        state.ruleEffect.run();
        state.styleEffect.run();
      } else {
        // Fresh mount: resubscribe to the initializer's dependencies.
        // styleEffect resubscribes itself during render.
        for (const observable of state.ruleEffect.dependencies ?? []) {
          observable.get(state.ruleEffect);
        }
      }
    }
    hasCommittedRef.current = true;
    return () => {
      cleanupEffect(state.ruleEffect);
      cleanupEffect(state.styleEffect);
    };
  }, [state.ruleEffect, state.styleEffect]);

  // Check if our derived state has changed (e.g the className prop)
  if (
    testGuards(state, originalProps, inheritedVariables, inheritedContainers)
  ) {
    /**
     * Get the new state
     * Note, this might result in the same styles, but the guards will now be different
     */
    setState(
      updateRules(
        state,
        originalProps,
        inheritedVariables,
        inheritedContainers,
        true,
      ),
    );

    // We can bail on rendering as the result of this render will be discarded
    return createElement(Fragment);
  }

  let props = getStyledProps(
    state,
    originalProps,
    type === Image ? adaptImageProps : undefined,
  );

  if (type === View && props?.onPress) {
    type = Pressable;
  }

  if (state.animated) {
    type = animatedComponentFamily(type);
  }

  if (state.variables) {
    props = {
      value: state.variables,
      children: createElement(type, props),
    };
    type = VariableContext.Provider;
  }

  if (state.containers) {
    // Publish a new props snapshot even when this component's own rules did not
    // change. Descendants can depend on an ancestor attribute through a group.
    const containers = Object.fromEntries(
      Object.entries(state.containers).map(([name, container]) => [
        name,
        container.key === state.ruleEffectGetter
          ? { key: container.key, props: originalProps }
          : (inheritedContainers[name] ?? container),
      ]),
    );
    props = {
      value: containers,
      children: createElement(type, props),
    };
    type = ContainerContext.Provider;
  }

  return createElement(type, props);
}

/**
 * Convert the styled() mapping to a config array
 */
export function mappingToConfig(mapping: StyledConfiguration<any>) {
  // A JavaScript consumer can pass any value, so each one is checked here rather than read at render
  const entries: readonly (readonly [string, unknown])[] =
    Object.entries(mapping);
  return entries.flatMap(([key, value]): Config => {
    if (value === true) {
      return {
        source: key,
        target: key,
      };
    } else if (value === false) {
      return { source: key, target: false };
    } else if (typeof value === "string") {
      return { source: key, target: value.split(".") };
    } else if (typeof value === "object" && value !== null) {
      // Keep the declared deprecated alias working. The current spelling wins
      // when both are provided, including an intentionally empty mapping.
      const nativeStyleMapping = nativeStyleMappingToConfig(
        key,
        ("nativeStyleMapping" in value
          ? value.nativeStyleMapping
          : undefined) ??
          ("nativeStyleToProp" in value ? value.nativeStyleToProp : undefined),
      );

      if (isPath(value)) {
        return { source: key, target: value, nativeStyleMapping };
      }

      if ("target" in value) {
        if (value.target === false) {
          return { source: key, target: false, nativeStyleMapping };
        } else if (typeof value.target === "string") {
          const target = value.target.split(".");

          if (target.length === 1) {
            return { source: key, target: target[0]!, nativeStyleMapping };
          } else {
            return { source: key, target, nativeStyleMapping };
          }
        } else if (isPath(value.target)) {
          return { source: key, target: value.target, nativeStyleMapping };
        }
      }
    }

    throw new Error(
      `styled(): Invalid mapping for ${key}: ${describeMappingValue(value)}`,
    );
  });
}

function isPath(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((part) => typeof part === "string")
  );
}

function nativeStyleMappingToConfig(
  key: string,
  mapping: unknown,
): Record<string, string> | undefined {
  if (!mapping) {
    return undefined;
  }
  if (typeof mapping !== "object" || Array.isArray(mapping)) {
    throw new Error(
      `styled(): Invalid mapping for ${key}: nativeStyleMapping is ${describeMappingValue(mapping)}`,
    );
  }
  return Object.fromEntries(
    Object.entries(mapping).flatMap(([property, path]: [string, unknown]) => {
      if (path === undefined) {
        return [];
      }
      if (path === true) {
        return [[property, property] as const];
      }
      if (typeof path === "string") {
        return [[property, path] as const];
      }
      throw new Error(
        `styled(): Invalid mapping for ${key}: ${property} maps to ${describeMappingValue(path)}`,
      );
    }),
  );
}

function describeMappingValue(value: unknown): string {
  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "bigint":
      return `${value}n`;
    case "function":
      return "a function";
    case "object":
      if (value === null) {
        return "null";
      }
      return Array.isArray(value) ? "an array" : "an object";
    case "number":
    case "boolean":
    case "symbol":
    case "undefined":
      return String(value);
  }
}

// Apply native Image fitting before normal, inline, and important props merge.
// The compiler's contentFit mapping remains available to Expo Image adapters.
function adaptImageProps(props: Record<string, any> | undefined) {
  if (!props || !("contentFit" in props)) return props;
  const { contentFit, style, ...rest } = props;
  return {
    ...rest,
    style: { ...StyleSheet.flatten(style), objectFit: contentFit },
  };
}
