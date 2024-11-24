import { createElement, ForwardedRef, type ComponentType } from "react";

import { Props } from "../runtime.types";
import { inlineStylesMap } from "./globals";
import { Config } from "./native.types";
import { setValue } from "./utils/properties";

export function usePassThrough(
  type: ComponentType<any>,
  configs: Config[],
  props: Props,
  ref?: ForwardedRef<any>,
) {
  if (props) {
    props = ref ? { ...props, ref } : { ...props };
  }

  for (const config of configs) {
    if (config.target === false) continue;

    const placeholder = {};
    const source = props?.[config.source];

    // If the source is not a string or is empty, skip this config
    if (typeof source !== "string" || !source) continue;

    inlineStylesMap.set(placeholder, {
      classNames: source.split(/\s+/),
      config,
    });

    delete props?.[config.source];
    props ??= {};

    if (props[config.target]) {
      props[config.target] = Array.isArray(config.target)
        ? [...config.target, placeholder]
        : [config.target, placeholder];
    } else {
      props[config.target] = placeholder;
    }
  }

  return createElement(type, props, props?.children);
}
