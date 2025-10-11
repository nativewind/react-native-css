/* eslint-disable */
import {
  createElement,
  Fragment,
  useContext,
  useEffect,
  useState,
  type ComponentType,
} from "react";
import { Pressable, View } from "react-native";

import { VariableContext } from "react-native-css/native-internal";

import type { StyledConfiguration } from "../../runtime.types";
import { testGuards, type RenderGuard } from "../conditions/guards";
import {
  cleanupEffect,
  ContainerContext,
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
  nativeStyleMapping?: Record<string, string>;
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
    // Both effects share the same observers to improve memory usage
    const observers = new Set<Effect>();

    /**
     * When fired, this effect will force the rules to be re-evaluated.
     * This will cause a re-render if there are different rules
     *
     * Use this when a rule condition changes, e.g FastRefresh or media queries
     */
    const ruleEffect: Effect = {
      observers,
      run: () => setState((state) => updateRules(state)),
    };

    /**
     * When fired, this effect will force a re-render of the component.
     * This will cause a re-fetch of the styles.
     *
     * Use this when a value changes, e.g vm units or light / dark mode
     */
    const styleEffect: Effect = {
      observers,
      run: () => setState((state) => ({ ...state })),
    };

    return updateRules(
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
  });

  // Both effects share the same observers, so we only need to cleanup one of them
  useEffect(() => () => cleanupEffect(state.ruleEffect), [state.ruleEffect]);

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

  let props = getStyledProps(state, originalProps);

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
    props = {
      value: state.containers,
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
  return Object.entries(mapping).flatMap(([key, value]): Config => {
    if (value === true) {
      return {
        source: key,
        target: key,
      };
    } else if (value === false) {
      return { source: key, target: false };
    } else if (typeof value === "string") {
      return { source: key, target: value.split(".") };
    } else if (typeof value === "object") {
      const nativeStyleMapping = value.nativeStyleMapping as
        | Record<string, string>
        | undefined;

      if (Array.isArray(value)) {
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
        } else if (Array.isArray(value.target)) {
          return { source: key, target: value.target, nativeStyleMapping };
        }
      }
    }

    throw new Error(`styled(): Invalid mapping for ${key}: ${value}`);
  });
}
