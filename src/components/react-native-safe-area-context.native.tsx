import { useContext, useMemo, type PropsWithChildren } from "react";

import { VariableContext } from "react-native-css/style-collection";
import {
  SafeAreaProvider as OriginalSafeAreaProvider,
  useSafeAreaInsets,
  type SafeAreaProviderProps,
} from "react-native-safe-area-context";

export * from "react-native-safe-area-context";

export function SafeAreaProvider({
  children,
  ...props
}: SafeAreaProviderProps) {
  return (
    <OriginalSafeAreaProvider {...props}>
      <SafeAreaEnv>{children}</SafeAreaEnv>
    </OriginalSafeAreaProvider>
  );
}

function SafeAreaEnv({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const parentVars = useContext(VariableContext);

  const value = useMemo(
    () => ({
      ...parentVars,
      "--react-native-css-safe-area-inset-bottom": insets.bottom,
      "--react-native-css-safe-area-inset-left": insets.left,
      "--react-native-css-safe-area-inset-right": insets.right,
      "--react-native-css-safe-area-inset-top": insets.top,
    }),
    [parentVars, insets],
  );

  return <VariableContext value={value}>{children}</VariableContext>;
}
