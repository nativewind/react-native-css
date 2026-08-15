/* eslint-disable  */
import { useContext, useState, type ComponentType } from "react";
import { Appearance, DeviceEventEmitter } from "react-native";

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
    return colorSchemeObs.get() ?? Appearance.getColorScheme() ?? "light";
  },
  set(value) {
    // Every reader, in one call. There are three, and they are three separate
    // channels: the class layer reads the observable, useColorScheme() reads
    // Appearance's cache, and every store built the documented way is wired to
    // Appearance.addChangeListener. Moving one without the others splits the
    // app's own UI
    const previous = Appearance.getColorScheme();
    Appearance.setColorScheme(value);
    colorSchemeObs.set(value);

    // RN's setColorScheme assigns the cache and calls the native module; the
    // only eventEmitter.emit("change") in Libraries/Utilities/Appearance.js is
    // inside the `appearanceChanged` handler. So a write the platform does not
    // echo back moves getColorScheme() and notifies nobody. Announce it on the
    // same device event the platform uses, so Appearance itself performs the
    // cache write and the emit exactly as it does for an OS change.
    //
    // Guarded on the cache having actually moved, so this reports a change and
    // never invents one: where there is no native Appearance module the write
    // above is a no-op and both reads are null, and a redundant set of the
    // current scheme is silent — matching the observable's own equality guard.
    const current = Appearance.getColorScheme();
    if (current !== previous) {
      DeviceEventEmitter.emit("appearanceChanged", { colorScheme: current });
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
