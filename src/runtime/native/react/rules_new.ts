import { StyleCollection } from "../injection";
import type {
  ContainerContextValue,
  VariableContextValue,
} from "../reactivity";
import type { GetFunction } from "../tracking";
import type { Config } from "./useNativeCss";

export function updateRulesNew(
  get: GetFunction,
  originalProps: Record<string, unknown>,
  configs: Config[],
  inheritedVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue,
) {
  let inlineVariables: Record<string, unknown> | undefined;
  let animated = false;

  for (const config of configs) {
    const styleRuleSet = [];

    const source = originalProps[config.source];
    if (typeof source === "string") {
      const classNames = source.split(/\s+/);
      for (const className of classNames) {
        styleRuleSet.push(...get(StyleCollection.styles(className)));
      }
    }
  }
}
