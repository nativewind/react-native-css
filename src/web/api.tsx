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
  StyledConfiguration,
  StyledOptions,
} from "react-native-css";

import type { ReactComponent, Styled } from "../runtime.types";
import { assignStyle } from "./assign-style";

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

interface RootElement {
  readonly classList: {
    add(...tokens: string[]): void;
    contains(token: string): boolean;
    remove(...tokens: string[]): void;
  };
  readonly style: {
    removeProperty(property: string): string;
    setProperty(property: string, value: string): void;
  };
}

// The package compiles without the DOM lib, and the document is absent while a route prerenders
declare const document: { readonly documentElement: RootElement } | undefined;

const EXPLICIT_SCHEMES = ["dark", "light"] as const;

const resolveRootElement = (): RootElement | undefined =>
  typeof document === "undefined" ? undefined : document.documentElement;

// No page can override prefers-color-scheme, so an explicit scheme is a class on the root, which Tailwind's class strategy reads, and color-scheme, which light-dark() follows
export const colorScheme: ColorScheme = {
  get() {
    const root = resolveRootElement();
    return (
      EXPLICIT_SCHEMES.find((scheme) => root?.classList.contains(scheme)) ??
      Appearance.getColorScheme() ??
      "light"
    );
  },
  set(name) {
    const root = resolveRootElement();
    if (!root) {
      return;
    }

    root.classList.remove(...EXPLICIT_SCHEMES);
    if (name === "dark" || name === "light") {
      root.classList.add(name);
      root.style.setProperty("color-scheme", name);
    } else {
      root.style.removeProperty("color-scheme");
    }
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
