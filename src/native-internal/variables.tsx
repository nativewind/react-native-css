import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";

import { VAR_SYMBOL, type VariableContextValue } from "../native/reactivity";
import type { CustomPropertyValue } from "../runtime.types";

globalThis.__react_native_css_variable_context ??=
  createContext<VariableContextValue>({
    [VAR_SYMBOL]: true,
  });

export const VariableContext = globalThis.__react_native_css_variable_context;

export function VariableContextProvider(
  props: PropsWithChildren<{
    value: Record<`--${string}`, CustomPropertyValue>;
  }>,
) {
  const inheritedVariables = useContext(VariableContext);

  const value: VariableContextValue = useMemo(
    () => ({
      ...inheritedVariables,
      ...Object.fromEntries(
        Object.entries(props.value).map(([k, v]) => [k.replace(/^--/, ""), v]),
      ),
      [VAR_SYMBOL]: true,
    }),
    [inheritedVariables, props.value],
  );

  return <VariableContext value={value}>{props.children}</VariableContext>;
}
