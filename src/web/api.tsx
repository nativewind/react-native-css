import {
  createElement,
  useMemo,
  type ComponentPropsWithRef,
  type ComponentType,
  type PropsWithChildren,
} from "react";
import { Appearance } from "react-native";

import type {
  ColorScheme,
  Props,
  StyledConfiguration,
  StyledOptions,
  StyledProps,
} from "react-native-css";

import type { ReactComponent } from "../runtime.types";
import { assignStyle } from "./assign-style";

const defaultMapping: StyledConfiguration<ComponentType<{ style: unknown }>> = {
  className: "style",
};

export const styled = <
  const C extends ReactComponent,
  const M extends StyledConfiguration<C>,
>(
  baseComponent: C,
  mapping: M = defaultMapping as M,
  _options?: StyledOptions,
) => {
  return (props: StyledProps<ComponentPropsWithRef<C>, M>) => {
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
  set() {
    // `Appearance` here is react-native-web's, which reads through to
    // `matchMedia("(prefers-color-scheme: dark)")` and exposes no setter. The
    // browser owns the color scheme on web and evaluates
    // `@media (prefers-color-scheme)` itself, so unlike the native runtime
    // there is no observable for an override to drive. Reporting that is the
    // only honest option: returning silently would leave an in-app theme
    // toggle broken with nothing to find.
    throw new Error(
      "colorScheme.set() is not supported on web: the browser owns the color scheme. Style the two schemes with @media (prefers-color-scheme) and let the browser pick.",
    );
  },
};

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
