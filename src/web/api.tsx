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

import type {
  CustomPropertyValue,
  ReactComponent,
  Styled,
} from "../runtime.types";
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

export const colorScheme: ColorScheme = {
  get() {
    return Appearance.getColorScheme();
  },
  set(name) {
    Appearance.setColorScheme(name ?? "unspecified");
  },
};

// undefined leaves the property unset, and drops out of a list
function serializeCustomProperty(
  value: CustomPropertyValue,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((member) => serializeCustomProperty(member))
      .filter((member) => member !== undefined)
      .join(",");
  }

  return String(value);
}

function toCustomProperties(variables: Record<string, CustomPropertyValue>) {
  const properties: Record<string, string> = {};

  for (const [key, value] of Object.entries(variables)) {
    const serialized = serializeCustomProperty(value);

    if (serialized !== undefined) {
      properties[key.startsWith("--") ? key : `--${key}`] = serialized;
    }
  }

  return properties;
}

/**
 * @deprecated Use `<VariableContextProvider />` instead.
 */
export function vars(variables: Record<string, CustomPropertyValue>) {
  return toCustomProperties(variables);
}

export function VariableContextProvider(
  props: PropsWithChildren<{
    value: Record<`--${string}`, CustomPropertyValue>;
  }>,
) {
  const style = useMemo(() => {
    return {
      display: "contents",
      ...toCustomProperties(props.value),
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
