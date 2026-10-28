/* eslint-disable */
import type { ComponentState } from "../react/useNativeCss";
import type {
  ContainerContextValue,
  PUBLISHER_INHERITED_VARIABLES,
  VariableContextValue,
} from "../reactivity";

export type RenderGuard =
  | ["a", string, any]
  | ["d", string, any]
  | ["v", string | typeof PUBLISHER_INHERITED_VARIABLES, any]
  | ["c", string, WeakKey];

export function testGuards(
  state: ComponentState,
  currentProps: any,
  inheritedVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue,
) {
  return state.guards?.some((guard) => {
    let result = false;

    switch (guard[0]) {
      case "a":
        // Attribute
        result = currentProps?.[guard[1]] !== guard[2];
        break;
      case "d":
        // DataSet
        result = currentProps?.dataSet?.[guard[1]] !== guard[2];
        break;
      case "v":
        // Variables
        result = inheritedVariables[guard[1]] !== guard[2];
        break;
      case "c":
        // Containers
        result = inheritedContainers[guard[1]] !== guard[2];
        break;
    }

    return result;
  });
}
