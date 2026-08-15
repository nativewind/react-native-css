import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";

import type { StyleDescriptor } from "react-native-css/compiler";

import { VAR_SYMBOL, type VariableContextValue } from "../native/reactivity";
import { assignInheritedVariables } from "./root";

globalThis.__react_native_css_variable_context ??=
  createContext<VariableContextValue>({
    [VAR_SYMBOL]: true,
  });

export const VariableContext = globalThis.__react_native_css_variable_context;

export function VariableContextProvider(
  props: PropsWithChildren<{ value: Record<`--${string}`, StyleDescriptor> }>,
) {
  const inheritedVariables = useContext(VariableContext);

  const value: VariableContextValue = useMemo(() => {
    const published: VariableContextValue = {
      ...inheritedVariables,
      [VAR_SYMBOL]: true,
    };

    assignInheritedVariables(
      published,
      Object.entries(props.value).map(
        ([name, value]) => [name.replace(/^--/, ""), value] as const,
      ),
    );

    return published;
  }, [inheritedVariables, props.value]);

  return <VariableContext value={value}>{props.children}</VariableContext>;
}
