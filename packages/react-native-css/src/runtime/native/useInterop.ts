import {
  createElement,
  ForwardedRef,
  useContext,
  useDebugValue,
  useEffect,
  useReducer,
  type ComponentType,
  type Dispatch,
} from "react";

import type { SharedValue } from "react-native-reanimated";

import type {
  Props,
  SharedValueInterpolation,
  StyledConfiguration,
  Transition,
} from "../runtime";
import { testContainerQuery } from "./conditions/container-query";
import type { ContainerContextValue, VariableContextValue } from "./contexts";
import { ContainerContext, VariableContext } from "./contexts";
import {
  activeFamily,
  containerLayoutFamily,
  containerWidthFamily,
  focusFamily,
  hoverFamily,
} from "./globals";
import type { Config, SideEffect } from "./native.types";
import { animatedComponent } from "./reanimated";
import {
  configReducer,
  type ConfigReducerAction,
  type ConfigReducerState,
} from "./reducer";
import { useHandlers } from "./useHandlers";
import { ProduceRecord } from "./utils/immutability";
import { cleanupEffect } from "./utils/observable";

export type UseInteropState = Readonly<{
  key: WeakKey;
  epoch: number;
  dispatch: Dispatch<PerformConfigReducerAction[]>;
  // The type this component will render as.
  type: ComponentType<any>;
  // The props that will be passed to the type.
  props?: Record<string, any>;
  // The results of the config reducers grouped by their key
  configStates: ConfigReducerState[];
  // The variables for each config, grouped by config key
  variables?: VariableContextValue;
  // The containers for each config, grouped by config key
  containers?: ContainerContextValue;
  // The side effects for each config, grouped by config key
  sideEffects?: SideEffect[];

  sharedValues?: SharedValue<any>[];
  baseStyles?: Record<string, any>;
  animations?: SharedValueInterpolation[];
  transitions?: Transition[];
}>;

export type UseInteropDispatch = UseInteropState["dispatch"];

type PerformConfigReducerAction = Readonly<{
  action: ConfigReducerAction;
  index: number;
}>;

export function useInterop(
  type: ComponentType<any>,
  configStates: ConfigReducerState[],
  initialActions: PerformConfigReducerAction[],
  props: Props,
  ref?: ForwardedRef<any>,
) {
  const inheritedVariables = useContext(VariableContext);
  const inheritedContainers = useContext(ContainerContext);

  const reducerState = useReducer(
    /**
     * Reducers can capture current values, so rebuild the reducer each time
     * This is a performance de-optimization, but it's better than writing
     * to refs or using side effects.
     */
    (state: UseInteropState, actions: PerformConfigReducerAction[]) => {
      return performConfigReducerActions(
        state,
        actions,
        props,
        inheritedVariables,
        inheritedContainers,
      );
    },
    undefined,
    () => {
      return performConfigReducerActions(
        {
          key: {},
          type,
          configStates,
          dispatch: (actions) => dispatch(actions),
          epoch: 0,
        },
        initialActions,
        props,
        inheritedVariables,
        inheritedContainers,
      );
    },
  );

  let state = reducerState[0];
  let dispatch = reducerState[1];

  maybeRerenderComponent(
    state,
    dispatch,
    props,
    inheritedVariables,
    inheritedContainers,
  );

  /**
   * The declarations and styles need to be cleaned up when the component
   * unmounts, as they will hold references to observables.
   *
   * Observables created by this component (e.g hover observables) will be
   * automatically removed as they are weakly referenced, and each component
   * that references them (should only be unmounting children) will remove their
   * reference either on unmount or next rerender.
   */
  useEffect(() => {
    return () => {
      for (const key in state.configStates) {
        const configState = state.configStates[key];
        cleanupEffect(configState.declarations);
        cleanupEffect(configState.styles);
      }
    };
  }, []);

  useDebugValue(state);

  let nextType = state.type;
  let nextProps: Props = { ...props, ...state.props, ref };

  for (const config of state.configStates) {
    if (config.source !== config.target) {
      delete nextProps[config.source];
    }
  }

  nextProps = useHandlers(state, nextProps);

  if (state.animations || state.transitions) {
    nextProps.$$state = state;
  }

  if (state.variables) {
    nextProps = {
      value: state.variables,
      children: createElement(nextType, nextProps),
    };
    nextType = VariableContext.Provider;
  }

  if (state.containers) {
    nextProps = {
      value: state.containers,
      children: createElement(nextType, nextProps),
    };
    nextType = ContainerContext.Provider;
  }

  return createElement(nextType, nextProps);
}

function maybeRerenderComponent(
  state: UseInteropState,
  dispatch: Dispatch<PerformConfigReducerAction[]>,
  props: Props,
  variables: VariableContextValue,
  containers: ContainerContextValue,
) {
  const declarationSet = new Set<ConfigReducerState>();
  const styleSet = new Set<ConfigReducerState>();

  for (const configState of state.configStates) {
    const shouldRerenderDeclarations = configState.declarations?.guards?.some(
      (guard) => {
        switch (guard[0]) {
          case "a":
            return props?.[guard[1]] !== guard[2];
          case "d":
            return props?.dataSet?.[guard[1]] !== guard[2];
          case "v":
            return variables[guard[1]] !== guard[2];
          case "c":
            return testContainerQuery(guard[1], containers) !== guard[2];
          default:
            guard satisfies never;
            return false;
        }
      },
    );

    if (shouldRerenderDeclarations) {
      declarationSet.add(configState);
    }

    const shouldRerenderStyles =
      configState.styles?.guards &&
      configState.styles.guards.length > 0 &&
      configState.styles.guards.some((guard) => {
        switch (guard[0]) {
          case "a":
            return props?.[guard[1]] !== guard[2];
          case "d":
            return props?.dataSet?.[guard[1]] !== guard[2];
          case "v":
            return variables[guard[1]] !== guard[2];
          case "c":
            return false;
          default:
            guard satisfies never;
            return false;
        }
      });

    if (shouldRerenderStyles) {
      styleSet.add(configState);
    }
  }

  const actions: PerformConfigReducerAction[] = [];

  for (const configState of declarationSet) {
    actions.push({
      action: { type: "update-definitions" },
      index: configState.index,
    });
  }

  for (const configState of styleSet) {
    actions.push({
      action: { type: "update-styles" },
      index: configState.index,
    });
  }

  if (actions.length) {
    dispatch(actions);
  }
}

export function initUseInterop(
  dispatch: Dispatch<PerformConfigReducerAction[]>,
  type: ComponentType,
  configStates: ConfigReducerState[],
  actions: Readonly<PerformConfigReducerAction[]>,
  incomingProps: Props,
  inheritedVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue,
): UseInteropState {
  return performConfigReducerActions(
    {
      key: {},
      type,
      configStates,
      dispatch,
      epoch: 0,
    },
    actions,
    incomingProps,
    inheritedVariables,
    inheritedContainers,
  );
}

export function performConfigReducerActions(
  previous: UseInteropState,
  actions: Readonly<PerformConfigReducerAction[]>,
  incomingProps: Props,
  inheritedVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue,
): UseInteropState {
  let configStatesToUpdate: [number, ConfigReducerState][] | undefined;

  /**
   * This reducer's state is used as the props for multiple components/hooks.
   * So we need to preserve the value if it didn't change.
   *
   * For example, setting a new variable shouldn't change the container attribute.
   */
  for (const { index, action } of actions) {
    const configState = previous.configStates[index];
    const nextConfigState = configReducer(
      configState,
      action,
      previous,
      incomingProps,
      inheritedVariables,
      inheritedContainers,
    );

    /**
     * If the config state didn't change, we can skip updating the state.
     */
    if (Object.is(configState, nextConfigState)) {
      continue;
    }

    configStatesToUpdate ??= [];
    configStatesToUpdate.push([index, nextConfigState]);
  }

  // If this was never created, then nothing changed
  if (!configStatesToUpdate) {
    return previous;
  }

  const configStates = [...previous.configStates];
  for (const [index, configState] of configStatesToUpdate) {
    configStates[index] = configState;
  }

  let sideEffects: UseInteropState["sideEffects"];
  let sharedValues: UseInteropState["sharedValues"];
  let animations: UseInteropState["animations"];
  let transitions: UseInteropState["transitions"];
  let baseStyles: UseInteropState["baseStyles"];
  let props: UseInteropState["props"];

  let variableDraft: ProduceRecord<typeof inheritedVariables> | undefined;
  let containerDraft: ProduceRecord<typeof inheritedContainers> | undefined;

  for (const state of configStates) {
    if (state.declarations?.variables) {
      variableDraft ??= new ProduceRecord(inheritedVariables);
      variableDraft.assign(state.declarations.variables);
    }

    if (state.declarations?.containers) {
      containerDraft ??= new ProduceRecord(inheritedContainers);
      containerDraft.assign(state.declarations.containers);
    }

    if (state.declarations?.sideEffects) {
      sideEffects ??= [];
      sideEffects.push(...state.declarations?.sideEffects);
    }

    if (state.styles) {
      props ??= {};
      Object.assign(props, state.styles.props);

      if (state.styles.sideEffects) {
        sideEffects ??= [];
        sideEffects.push(...state.styles?.sideEffects);
      }

      if (state.styles.animationIO) {
        sharedValues ??= [];
        animations ??= [];
        baseStyles ??= {};
        Object.assign(baseStyles, state.styles.baseStyles);
        for (const animation of state.styles.animationIO) {
          sharedValues.push(animation[0]);
          animations.push(animation);
        }
      }
    }

    if (state.declarations?.transition) {
      sharedValues ??= [];
      transitions ??= [];
      if (state.styles?.transitions) {
        for (const transition of state.styles.transitions) {
          sharedValues.push(transition[1]);
          transitions.push(transition);
        }
      }
    }
  }

  const type =
    animations || transitions
      ? animatedComponent(previous.type)
      : previous.type;

  const variables = variableDraft?.commit() ?? previous.variables;
  const containers = containerDraft?.commit() ?? previous.containers;

  const next: UseInteropState = {
    ...previous,
    variables,
    type,
    baseStyles,
    props,
    configStates,
    containers,
    animations,
    transitions,
    sharedValues,
    sideEffects,
  };

  if (containers) {
    /**
     * We are a container, so register with the event handlers
     */
    activeFamily(next.key);
    focusFamily(next.key);
    hoverFamily(next.key);
    containerWidthFamily(next.key);

    /**
     * If we have a width or height, update the layout
     * This ensures the values are set before the children are rendered
     */
    if (next.props?.style) {
      if (next.props.style.width || next.props.style.height) {
        const layout = Object.assign({}, containerLayoutFamily(next.key).get());
        if (next.props.style.width) {
          layout.width = next.props.style.width;
        }
        if (next.props.style.height) {
          layout.height = next.props.style.height;
        }

        /**
         * Set the value but ignore any effects.
         * Rerenders will handled by React Context / onLayout updating
         */
        containerLayoutFamily(next.key).batch(undefined, layout);
      }
    }
  }

  return next;
}

export function getUseInteropOptions(options: StyledConfiguration<any>) {
  const configs: Config[] = [];
  const configStates: ConfigReducerState[] = [];
  const initialActions: PerformConfigReducerAction[] = [];

  const configEntries = Object.entries(options);

  configEntries.forEach(([source, config], index) => {
    let target = typeof config === "object" ? config.target : config;

    if (target === true) {
      target = source;
    }

    let nativeStyleToProp: Config["nativeStyleToProp"];

    if (typeof config === "object" && config.nativeStyleToProp) {
      nativeStyleToProp = Object.fromEntries(
        Object.entries(config.nativeStyleToProp).map(([key, value]) => {
          return [key, value === true ? [key] : value.split(".")];
        }),
      );
    }

    configStates[index] = {
      index,
      source,
      target,
      nativeStyleToProp,
    };

    configs.push({
      source,
      target,
      nativeStyleToProp,
    });

    initialActions.push({
      action: { type: "update-definitions" },
      index,
    });
  });

  return { configStates, initialActions, configs };
}
