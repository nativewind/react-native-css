import { forwardRef } from "react";

import type { JSXFunction, Styled } from "../runtime.types";
import { getUseInteropOptions, useInterop } from "./useInterop";

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
export const styled: Styled = (baseComponent, mapping) => {
  const { configs, initialActions } = getUseInteropOptions(mapping);

  let component: any;
  const type = getComponentType(baseComponent);

  if (type === "function") {
    component = (props: Record<string, any>) => {
      return useInterop(baseComponent, configs, initialActions, props);
    };
  } else {
    component = forwardRef((props, ref) => {
      return useInterop(baseComponent, configs, initialActions, props, ref);
    });
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
