import { StyleSheet as RNStyleSheet } from "react-native";

import { ReactNativeCssStyleSheet } from "../../compiler";
import {
  animationFamily,
  rootVariables,
  styleFamily,
  universalVariables,
} from "./globals";
import { Effect } from "./utils/observable";

export const StyleSheet = Object.assign({}, RNStyleSheet, {
  register: injectData,
});

export function injectData(options: ReactNativeCssStyleSheet) {
  debugger;
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
      rootVariables(variable[0]).set(variable[1]);
    }
  }

  if (options.vu) {
    for (const variable of options.vu) {
      universalVariables(variable[0]).set(variable[1]);
    }
  }

  // Run all the queued effects
  for (const effect of batch) {
    effect.run();
  }
}
