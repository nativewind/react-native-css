/* eslint-disable */
import {
  useContext,
  useMemo,
  type ComponentProps,
  type PropsWithChildren,
} from "react";

import {
  SafeAreaProvider as RNSafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  VariableContext,
  type VariableContextValue,
} from "../../runtime/native/reactivity";

export function SafeAreaProvider({
  children,
  ...props
}: ComponentProps<typeof RNSafeAreaProvider>) {
  return (
    <RNSafeAreaProvider {...props}>
      <SafeAreaProviderEnv>{children}</SafeAreaProviderEnv>
    </RNSafeAreaProvider>
  );
}

function SafeAreaProviderEnv({ children }: PropsWithChildren<unknown>) {
  const insets = useSafeAreaInsets();
  const parentVarContext = useContext(VariableContext);

  const value = useMemo<VariableContextValue>(
    () => ({
      ...parentVarContext,
      "--react-native-css-safe-area-inset-bottom": insets.bottom,
      "--react-native-css-safe-area-inset-left": insets.left,
      "--react-native-css-safe-area-inset-right": insets.right,
      "--react-native-css-safe-area-inset-top": insets.top,
    }),
    [parentVarContext, insets],
  );

  return (
    <VariableContext.Provider value={value}>
      {children}
    </VariableContext.Provider>
  );
}
