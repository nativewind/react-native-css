import { InjectStylesOptions } from "../runtime.types";
import { animationFamily, styleFamily } from "./globals";
import { Effect } from "./utils/observable";

export function injectData(options: InjectStylesOptions) {
  const batch = new Set<Effect>();

  if (options.s) {
    for (const style of options.s) {
      styleFamily(style[0]).batch(batch, style[1]);
    }
  }

  if (options.k) {
    for (const animation of options.k) {
      animationFamily(animation[0]).batch(batch, animation[1]);
    }
  }

  // Run all the queued effects
  for (const effect of batch) {
    effect.run();
  }
}

export function resetData() {
  styleFamily.clear();
}
