/* eslint-disable  */
import { useContext, useEffect, useState, type ComponentType } from "react";
import { Appearance, DeviceEventEmitter, type ViewStyle } from "react-native";

import type { StyleDescriptor } from "react-native-css/compiler";
import { VariableContext } from "react-native-css/native-internal";

import type {
  ColorScheme,
  Props,
  ReactComponent,
  Styled,
  StyledConfiguration,
  StyledOptions,
} from "../runtime.types";
import { mappingToConfig, useNativeCss } from "./react/useNativeCss";
import { usePassthrough } from "./react/usePassthrough";
import {
  cleanupEffect,
  colorScheme as colorSchemeObs,
  holdsRequestNotScheme,
  resolveColorScheme,
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
export const styled: Styled = (
  baseComponent: ReactComponent<any>,
  mapping: StyledConfiguration<any> = defaultMapping,
  options?: StyledOptions,
) => {
  let component: any;
  // const type = getComponentType(baseComponent);

  const configs = mappingToConfig(mapping);

  if (options?.passThrough) {
    component = (props: Record<string, any>) => {
      return usePassthrough(baseComponent, props, configs);
    };
  } else {
    component = (props: Record<string, any>) => {
      return useNativeCss(baseComponent, props, configs);
    };
  }

  const name = baseComponent.displayName ?? baseComponent.name ?? "unknown";
  component.displayName = `CssInterop.${name}`;
  return component;
};

export const colorScheme: ColorScheme = {
  get() {
    return resolveColorScheme(colorSchemeObs.get());
  },
  set(value) {
    const previous = Appearance.getColorScheme();
    // Resolved before the write, since react-native 0.82.0-0.84.1 caches a follow-the-system request verbatim
    const inForce = resolveColorScheme(colorSchemeObs.get());

    const request = value ?? "unspecified";
    Appearance.setColorScheme(request);
    colorSchemeObs.set(request === "unspecified" ? null : request);

    // Appearance.setColorScheme notifies no listener, so the scheme is announced on the event Appearance itself handles
    if ((value === "dark" || value === "light") && value !== previous) {
      DeviceEventEmitter.emit("appearanceChanged", { colorScheme: value });
    } else if (holdsRequestNotScheme(Appearance.getColorScheme())) {
      DeviceEventEmitter.emit("appearanceChanged", { colorScheme: inForce });
    }
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
  const [, forceUpdate] = useState(0);
  const [effect] = useState(() => {
    const effect: Effect = {
      observers: new Set(),
      run: () => forceUpdate((state) => state + 1),
    };

    const get: Getter = (observable) => observable.get(effect);

    return Object.assign(effect, { get });
  });

  useEffect(() => {
    // React StrictMode replays setup after cleanup without another render.
    if (effect.observers.size === 0) forceUpdate((state) => state + 1);
    return () => cleanupEffect(effect);
  }, [effect]);
  cleanupEffect(effect);
  return resolveValue([{}, "var", [name]], effect.get, { inheritedVariables });
}

/**
 * @deprecated Use `<VariableContextProvider />` instead.
 */
export function vars(variables: Record<string, StyleDescriptor>): ViewStyle {
  return Object.assign(
    { [VAR_SYMBOL]: "inline" },
    Object.fromEntries(
      Object.entries(variables).map(([k, v]) => [k.replace(/^--/, ""), v]),
    ),
  ) as ViewStyle;
}
