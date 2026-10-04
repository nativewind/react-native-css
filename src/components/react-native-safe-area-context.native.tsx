import { useContext, useMemo, type PropsWithChildren } from "react";

import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css";
import {
  VariableContext,
  VariableContextProvider,
} from "react-native-css/native-internal";
import {
  SafeAreaProvider as OriginalSafeAreaProvider,
  SafeAreaView as OriginalSafeAreaView,
  useSafeAreaInsets,
  type SafeAreaProviderProps,
  type SafeAreaViewProps,
} from "react-native-safe-area-context";

import { copyComponentProperties } from "./copyComponentProperties";

export * from "react-native-safe-area-context";

const safeAreaViewMapping = {
  className: "style",
} satisfies StyledConfiguration<typeof OriginalSafeAreaView>;

export const SafeAreaView = copyComponentProperties(
  OriginalSafeAreaView,
  (props: StyledProps<SafeAreaViewProps, typeof safeAreaViewMapping>) => {
    return useCssElement(OriginalSafeAreaView, props, safeAreaViewMapping);
  },
);

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

  return (
    <VariableContextProvider value={value}>{children}</VariableContextProvider>
  );
}
