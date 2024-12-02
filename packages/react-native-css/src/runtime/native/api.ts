import { forwardRef, useContext } from "react";

import type { StyleDescriptor } from "../../compiler";
import type { ColorScheme, JSXFunction, Styled } from "../runtime.types";
import { inlineSpecificity } from "../utils";
import { VariableContext } from "./contexts";
import {
  appColorScheme,
  inlineStylesMap,
  rootVariables,
  universalVariables,
} from "./globals";
import { ResolveOptions, resolveValue } from "./resolvers";
import { getUseInteropOptions, useInterop } from "./useInterop";
import { usePassThrough } from "./usePassThrough";

export const interopComponents = new Map<
  object | string,
  Parameters<JSXFunction>[0]
>();

/**
 * Generates a new Higher-Order component the wraps the base component and applies the styles.
 * This is added to the `interopComponents` map so that it can be used in the `wrapJSX` function
 * @param baseComponent
 * @param mapping
 */
export const styled: Styled = (baseComponent, mapping, options) => {
  const { configStates, initialActions, configs } =
    getUseInteropOptions(mapping);

  let component: any;
  const type = getComponentType(baseComponent);

  if (options?.passThrough) {
    if (type === "function") {
      component = (props: Record<string, any>) => {
        return usePassThrough(baseComponent, configs, props);
      };
    } else {
      component = forwardRef((props, ref) => {
        return usePassThrough(baseComponent, configs, props, ref);
      });
    }
  } else {
    if (type === "function") {
      component = (props: Record<string, any>) => {
        return useInterop(baseComponent, configStates, initialActions, props);
      };
    } else {
      component = forwardRef((props, ref) => {
        return useInterop(
          baseComponent,
          configStates,
          initialActions,
          props,
          ref,
        );
      });
    }
  }

  const name = baseComponent.displayName ?? baseComponent.name ?? "unknown";
  component.displayName = `CssInterop.${name}`;
  interopComponents.set(baseComponent, component);
  return component;
};

const ForwardRefSymbol = Symbol.for("react.forward_ref");
function getComponentType(component: any) {
  switch (typeof component) {
    case "function":
    case "object":
      return "$$typeof" in component && component.$$typeof === ForwardRefSymbol
        ? "forwardRef"
        : component.prototype?.isReactComponent
          ? "class"
          : typeof component;
    default:
      return "unknown";
  }
}

export const colorScheme: ColorScheme = {
  get() {
    return appColorScheme.get();
  },
  set(value) {
    return appColorScheme.set(value);
  },
};

export function useUnstableNativeVariable(name: string) {
  const variables = useContext(VariableContext);

  const options: ResolveOptions = {
    getVariable(name) {
      let value = resolveValue(variables?.[name], options);
      value ??= resolveValue(universalVariables(name).get(), options);
      value ??= resolveValue(rootVariables(name).get(), options);
      return value;
    },
  };

  return options.getVariable(name.startsWith("--") ? name.slice(2) : name);
}

export function vars(variables: Record<string, StyleDescriptor>) {
  const style = Object.freeze({});

  inlineStylesMap.set(style, [
    [
      {
        s: inlineSpecificity,
        v: Object.entries(variables).map(([name, value]) => {
          return [name.startsWith("--") ? name.slice(2) : name, value];
        }),
      },
    ],
  ]);

  // Purposely return an empty object to prevent people from using this as a style object
  return style as any;
}
