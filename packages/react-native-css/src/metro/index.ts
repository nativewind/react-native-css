import type { MetroConfig } from "metro-config";

import { getMetroConfig, WithCssOptions } from "./metro";

export * as picocolors from "./picocolors";

export function withCss<T extends MetroConfig | (() => Promise<MetroConfig>)>(
  config: T,
  options?: WithCssOptions,
): T {
  return (
    typeof config === "function"
      ? async function WithCSS() {
          return getMetroConfig(await config(), options);
        }
      : getMetroConfig(config, options)
  ) as T;
}
