import { createElement, forwardRef } from "react";
import { Appearance } from "react-native";

import { ColorScheme, Styled, UseCssElement } from "../runtime.types";
import { getComponentType } from "../utils/components";
import { assignStyle } from "./assign-style";

export const styled: Styled = (baseComponent, mapping) => {
  if (getComponentType(baseComponent) === "function") {
    return (props: Record<string, any>) => {
      return useCssElement(baseComponent, mapping, props);
    };
  } else {
    return forwardRef((props, ref) => {
      return useCssElement(baseComponent, mapping, props, ref);
    }) as any;
  }
};

export const useCssElement: UseCssElement = (
  component,
  mapping,
  incomingProps,
  ref,
) => {
  let props = { ...incomingProps };

  if (ref) {
    props.ref = ref;
  }

  for (const [key, value] of Object.entries(mapping)) {
    const source = props[key];
    if (!source) {
      continue;
    }

    delete props[key];

    let target: string | boolean =
      typeof value === "object" ? value.target : value;

    if (typeof target === "boolean") {
      target = key;
    }

    props = assignStyle(
      { $$css: true, [key]: source },
      target.split("."),
      props,
    );
  }

  return createElement(component, props);
};

export const colorScheme: ColorScheme = {
  get() {
    return Appearance.getColorScheme();
  },
  set(name) {
    return Appearance.setColorScheme(name);
  },
};

export function vars<T extends Record<`--${string}`, string | number>>(
  variables: T,
) {
  const $variables: Record<string, string> = {};

  for (const [key, value] of Object.entries(variables)) {
    if (key.startsWith("--")) {
      $variables[key] = value.toString();
    } else {
      $variables[`--${key}`] = value.toString();
    }
  }
  return $variables;
}
