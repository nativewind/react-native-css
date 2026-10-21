import {
  createElement,
  useMemo,
  type ComponentType,
  type PropsWithChildren,
} from "react";
import { Appearance } from "react-native";

import type {
  ColorScheme,
  Props,
  ReducedMotion,
  StyledConfiguration,
  StyledOptions,
} from "react-native-css";

import type {
  ReactComponent,
  ReducedMotionPreference,
  Styled,
} from "../runtime.types";
import { assignStyle } from "./assign-style";
import { browserPreference } from "./browser-preference";

const defaultMapping: StyledConfiguration<ComponentType<{ style: unknown }>> = {
  className: "style",
};

export const styled: Styled = (
  baseComponent: ReactComponent,
  mapping: StyledConfiguration<ReactComponent> = defaultMapping,
  _options?: StyledOptions,
) => {
  return (props: Props) => {
    return useCssElement(baseComponent, props, mapping);
  };
};

export const useCssElement = <C extends ReactComponent>(
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
    Appearance.setColorScheme(name ?? "unspecified");
  },
};

export const reducedMotion: ReducedMotion =
  browserPreference<ReducedMotionPreference>(() => {
    // Server rendering has no window, and React Native's jest environment a window without matchMedia
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "reduce"
      : "no-preference";
  });

/**
 * @deprecated Use `<VariableContextProvider />` instead.
 */
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

export function VariableContextProvider(
  props: PropsWithChildren<{ value: Record<`--${string}`, string | number> }>,
) {
  const style = useMemo(() => {
    return {
      display: "contents",
      ...Object.fromEntries(
        Object.entries(props.value).map(([key, value]) => [
          key.startsWith("--") ? key : `--${key}`,
          value,
        ]),
      ),
    };
  }, [props.value]);

  return <div style={style}>{props.children}</div>;
}

export const useNativeVariable = () => {
  throw new Error("useNativeVariable is not supported in web");
};

export const useUnstableNativeVariable = () => {
  throw new Error("useUnstableNativeVariable is not supported in web");
};
