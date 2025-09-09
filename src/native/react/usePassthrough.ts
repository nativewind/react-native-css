/* eslint-disable */
import { createElement, type ComponentType } from "react";

import { INLINE_RULE_SYMBOL } from "./rules";
import type { Config } from "./useNativeCss";

const cache = new Map<string, Record<string, any>>();

export function usePassthrough(
  type: ComponentType<any>,
  { ...props }: Record<string, any>,
  configs: Config[],
) {
  for (const config of configs) {
    let { source, target } = config;

    const classNames = props[source];

    let styles = cache.get(source);
    if (styles === undefined) {
      styles = { [INLINE_RULE_SYMBOL]: classNames };
    }

    delete props[source];

    if (classNames === undefined || target === false) {
      continue;
    }

    let targetProps = props;

    if (Array.isArray(target)) {
      for (let i = 0; i < target.length - 1; i++) {
        const prop = target[i]!;
        props[prop] ??= {};
        targetProps = props[prop];
      }
      target = target[target.length - 1]!;
    }

    if (Array.isArray(targetProps[target])) {
      targetProps[target] = [...targetProps[target], styles];
    } else if (targetProps[target]) {
      targetProps[target] = [targetProps[target], styles];
    } else {
      targetProps[target] = styles;
    }
  }

  return createElement(type, props);
}
