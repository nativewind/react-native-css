/* eslint-disable */
import type { ComponentState } from "../react/useNativeCss";
import type {
  ContainerContextValue,
  Effect,
  VariableContextValue,
} from "../reactivity";

export type RenderGuard =
  | ["a", string, any]
  | ["d", string, any]
  | ["v", string, any]
  | ["c", string, Effect];

export function testGuards(
  state: ComponentState,
  currentProps: any,
  inheritedVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue,
) {
  return state.guards?.some((guard) => {
    switch (guard[0]) {
      case "a":
        // Attribute
        return currentProps?.[guard[1]] !== guard[2];
      case "d":
        // DataSet
        return currentProps?.dataSet?.[guard[1]] !== guard[2];
      case "v":
        // Variables
        return inheritedVariables[guard[1]] !== guard[2];
      case "c":
        // Containers
        return inheritedContainers[guard[1]] !== guard[2];
    }
  });
}
