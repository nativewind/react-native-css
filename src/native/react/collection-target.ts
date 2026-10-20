import type { StyleRule } from "react-native-css/compiler";

import type { Config } from "./useNativeCss";

type RuleTarget = NonNullable<StyleRule["target"]>;

// A target:false config collects under its own source prop, which getStyledProps strips once its mapping has run; style belongs to the configs that target it
export function collectionTarget(config: Config): RuleTarget {
  return config.target === false ? { collect: config.source } : config.target;
}

export function targetPath(target: RuleTarget): string[] {
  if (typeof target === "string") {
    return [target];
  }

  return "collect" in target ? [target.collect] : target;
}

export function collectsProps(target: RuleTarget): boolean {
  return typeof target === "object" && "collect" in target;
}
