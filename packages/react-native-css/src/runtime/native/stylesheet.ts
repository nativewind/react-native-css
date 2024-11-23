import { Dimensions } from "react-native";

import { InjectStylesOptions } from "../runtime.types";
import {
  animationFamily,
  dimensions,
  rem,
  rootVariables,
  styleFamily,
  systemColorScheme,
  universalVariables,
} from "./globals";
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

  if (options.vr) {
    for (const variable of options.vr) {
      rootVariables(variable[0]).set(variable[1][0], variable[1][1]);
    }
  }

  if (options.vu) {
    for (const variable of options.vu) {
      universalVariables(variable[0]).set(variable[1][0], variable[1][1]);
    }
  }

  // Run all the queued effects
  for (const effect of batch) {
    effect.run();
  }
}
