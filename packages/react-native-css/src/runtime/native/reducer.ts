import type { Props } from "../runtime.types";
import type { ContainerContextValue, VariableContextValue } from "./contexts";
import { buildDeclarations, type Declarations } from "./declarations";
import type { Config } from "./native.types";
import { buildStyles, type Styles } from "./styles";
import type { UseInteropState } from "./useInterop";
import { cleanupEffect } from "./utils/observable";

export type ConfigReducerState = Config &
  Readonly<{
    // The key of the config, used to group props, variables, containers, etc.
    index: number;
    // The declarations that apply to this component
    declarations?: Declarations;
    // The styles from the declarations
    styles?: Styles;
  }>;

export type ConfigReducerAction = Readonly<
  { type: "update-styles" } | { type: "update-definitions" }
>;

export function configReducer(
  state: ConfigReducerState,
  action: ConfigReducerAction,
  componentState: UseInteropState,
  incomingProps: Props,
  inheritedVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue,
) {
  switch (action.type) {
    case "update-definitions": {
      let nextState = updateDefinitions(
        state,
        componentState,
        incomingProps,
        inheritedVariables,
        inheritedContainers,
      );
      return Object.is(state, nextState)
        ? state
        : updateStyles(
            nextState,
            componentState,
            incomingProps,
            inheritedVariables,
          );
    }
    case "update-styles": {
      return updateStyles(
        state,
        componentState,
        incomingProps,
        inheritedVariables,
      );
    }
    default: {
      action satisfies never;
      return state;
    }
  }
}

function updateDefinitions(
  state: ConfigReducerState,
  componentState: UseInteropState,
  props: Props,
  inheritedVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue,
): ConfigReducerState {
  const previous = state.declarations;
  let next = buildDeclarations(
    state,
    componentState,
    props,
    inheritedVariables,
    inheritedContainers,
  );

  /*
   * If they are the same epoch, then nothing changed.
   * However, we created a new effect that needs to be cleaned up
   */
  if (next.epoch === previous?.epoch) {
    cleanupEffect(next);
    return state;
  }

  // Clean up the previous effect
  cleanupEffect(previous);

  return {
    ...state,
    declarations: next,
  };
}

function updateStyles(
  previous: ConfigReducerState,
  componentState: UseInteropState,
  incomingProps: Props,
  inheritedVariables: VariableContextValue,
) {
  /**
   * Currently the styles will always be updated, but in the future we can
   * optimize this to only update when the props have changed.
   */
  const next = buildStyles(previous, incomingProps, inheritedVariables, () => {
    componentState.dispatch([
      { action: { type: "update-styles" }, index: previous.index },
    ]);
  });

  if (next.styles?.epoch === previous?.styles?.epoch) {
    /*
     * If they are the same epoch, then nothing changed.
     * However, we created a new effect that needs to be cleaned up
     */
    cleanupEffect(next.styles);
    return previous;
  }

  cleanupEffect(previous.styles);
  return next;
}
