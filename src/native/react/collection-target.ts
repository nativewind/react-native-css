import type { Config } from "./useNativeCss";

// A target:false config collects its declarations under its own source prop, which getStyledProps strips once its mapping has run; style belongs to the configs that target it
export function collectionTarget(config: Config): string | string[] {
  return config.target === false ? [config.source] : config.target;
}
