import { createElement, type ComponentProps } from "react";
import { Appearance } from "react-native";

import type {
  ColorScheme,
  Props,
  StyledConfiguration,
  StyledOptions,
  StyledProps,
} from "../runtime.types";
import type { ReactComponent } from "../utils";
import { assignStyle } from "./assign-style";

export const styled = <
  const C extends ReactComponent,
  const M extends StyledConfiguration<C>,
>(
  baseComponent: C,
  mapping: M,
  _options?: StyledOptions,
) => {
  return (props: StyledProps<ComponentProps<C>, M>) => {
    return useCssElement(baseComponent, mapping, props);
  };
};

export const useCssElement = <const C extends ReactComponent>(
  component: C,
  incomingProps: Props,
  mapping: StyledConfiguration<C>,
) => {
  let props = { ...incomingProps };

  for (const [key, value] of Object.entries(mapping)) {
    const source: unknown = props[key];
    if (!source) {
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
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
    Appearance.setColorScheme(name);
  },
};

export function vars(variables: Record<string, string | number>) {
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

export const useNativeVariable = () => {
  throw new Error("useNativeVariable is not supported in web");
};

export const useUnstableNativeVariable = () => {
  throw new Error("useUnstableNativeVariable is not supported in web");
};
