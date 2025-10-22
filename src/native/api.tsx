/* eslint-disable  */
import { forwardRef, useContext, useState, type ComponentType } from "react";
import { Appearance } from "react-native";

import type { StyleDescriptor } from "react-native-css/compiler";
import { VariableContext } from "react-native-css/native-internal";

import type {
  ColorScheme,
  Props,
  ReactComponent,
  StyledConfiguration,
  StyledOptions,
} from "../runtime.types";
import { mappingToConfig, useNativeCss } from "./react/useNativeCss";
import { usePassthrough } from "./react/usePassthrough";
import {
  colorScheme as colorSchemeObs,
  VAR_SYMBOL,
  type Effect,
  type Getter,
} from "./reactivity";
import { resolveValue } from "./styles/resolve";

export {
  StyleCollection,
  VariableContext,
  VariableContextProvider,
} from "react-native-css/native-internal";

export { useNativeCss };

const defaultMapping: StyledConfiguration<ComponentType<{ style: unknown }>> = {
  className: "style",
};

/**
 * Generates a new Higher-Order component the wraps the base component and applies the styles.
 * This is added to the `interopComponents` map so that it can be used in the `wrapJSX` function
 * @param baseComponent
 * @param mapping
 */
export const styled = <
  const C extends ReactComponent<any>,
  const M extends StyledConfiguration<C>,
>(
  baseComponent: C,
  mapping: M = defaultMapping as M,
  options?: StyledOptions,
) => {
  const configs = mappingToConfig(mapping);
  const name = baseComponent.displayName ?? baseComponent.name ?? "unknown";

  let component: any;

  if (options?.passThrough) {
    component = forwardRef<any, any>((props, ref) => {
      return usePassthrough(baseComponent, { ref, ...props }, configs);
    });
  } else {
    component = forwardRef<any, any>((props, ref) => {
      return useNativeCss(baseComponent, { ref, ...props }, configs);
    });
  }

  component.displayName = `CssInterop.${name}`;
  return component;
};

export const colorScheme: ColorScheme = {
  get() {
    return colorSchemeObs.get() ?? Appearance.getColorScheme() ?? "light";
  },
  set(value) {
    return colorSchemeObs.set(value);
  },
};

export const useUnstableNativeVariable = useNativeVariable;

export const useCssElement = <
  const C extends ReactComponent<any>,
  const M extends StyledConfiguration<C>,
>(
  component: C,
  incomingProps: Props,
  mapping: M,
) => {
  const [config] = useState(() => mappingToConfig(mapping));
  return useNativeCss(component, incomingProps, config);
};

export function useNativeVariable(name: string) {
  if (name.startsWith("--")) {
    name = name.slice(2);
  }

  const inheritedVariables = useContext(VariableContext);
  const [effect, setState] = useState(() => {
    const effect: Effect = {
      observers: new Set(),
      run: () => setState((state) => ({ ...state })),
    };

    const get: Getter = (observable) => observable.get(effect);

    return { ...effect, get };
  });

  return resolveValue([{}, "var", [name]], effect.get, { inheritedVariables });
}

/**
 * @deprecated Use `<VariableContextProvider />` instead.
 */
export function vars(variables: Record<string, StyleDescriptor>) {
  return Object.assign(
    { [VAR_SYMBOL]: "inline" },
    Object.fromEntries(
      Object.entries(variables).map(([k, v]) => [k.replace(/^--/, ""), v]),
    ),
  );
}
