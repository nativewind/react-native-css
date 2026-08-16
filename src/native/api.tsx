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
    return resolveColorScheme(colorSchemeObs.get());
  },
  set(value) {
    // Every reader, in one call. There are three, and they are three separate
    // channels: the class layer reads the observable, useColorScheme() reads
    // Appearance's cache, and every store built the documented way is wired to
    // Appearance.addChangeListener. Moving one without the others splits the
    // app's own UI
    const previous = Appearance.getColorScheme();

    // Resolved BEFORE the write, because on react-native 0.82.0-0.84.1 the
    // write is what destroys the ability to resolve: that band caches the
    // REQUESTED value verbatim, so a follow-the-system request leaves
    // Appearance.getColorScheme() answering the literal "unspecified" to every
    // reader in the app. react-native removed that in 0.85.3 by caching the
    // scheme in force instead; on the band that did not, this is the scheme in
    // force.
    const inForce = resolveColorScheme(colorSchemeObs.get());

    Appearance.setColorScheme(value);
    colorSchemeObs.set(value);

    // RN's setColorScheme assigns the cache and calls the native module; the
    // only eventEmitter.emit("change") in Libraries/Utilities/Appearance.js is
    // inside the `appearanceChanged` handler. So a write the platform does not
    // echo back moves getColorScheme() and notifies nobody. Announce it on the
    // same device event the platform uses, so Appearance itself performs the
    // cache write and the emit exactly as it does for an OS change.
    //
    // The announcement carries the REQUESTED scheme rather than a read of the
    // cache, because what that cache holds at this point differs across the
    // supported range: before 0.82 it is a read-back of the native module,
    // which is stale on both platforms — Android posts the night-mode switch to
    // the UI thread, iOS never assigns _currentColorScheme in the setter —
    // while from 0.82 a resolved scheme is stored as requested. Reading it back
    // would make this an announcement on one react-native and a no-op on
    // another.
    //
    // Only a resolved scheme is announced. Every other member of
    // ColorSchemeName is a hand-back rather than a scheme — null and undefined
    // before 0.82, the literal "unspecified" from 0.82 on — and only the OS
    // knows what one resolves to. Announcing it would put a value in
    // Appearance's cache that no reader can render; the platform's own echo
    // delivers the resolved scheme instead, exactly as it does for an OS
    // change. `previous` keeps a set of the scheme already in force silent.
    if ((value === "dark" || value === "light") && value !== previous) {
      DeviceEventEmitter.emit("appearanceChanged", { colorScheme: value });
    } else if (holdsRequestNotScheme(Appearance.getColorScheme())) {
      // The hand-back went through, and on 0.82.0-0.84.1 it left react-native's
      // own cache holding the request. That cache is not this library's — it is
      // what `useColorScheme()` and every documented store read — so routing
      // around it would leave the app answering "unspecified" while this
      // library answered correctly. Put the scheme in force back where every
      // reader looks for it, on the same device event the platform uses, and
      // Appearance performs the cache write and the emit exactly as it does for
      // an OS change. Nothing is announced on the bands whose cache can still
      // answer, because there the platform's own echo is still the only thing
      // that should move the scheme.
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
