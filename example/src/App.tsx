import { View as RNView } from "react-native";

import { styled, VariableContextProvider } from "react-native-css";
import { View } from "react-native-css/components";

import "../global.css";

const CustomView = styled(RNView, { className: "style" });

export default function App() {
  return (
    <View className="flex-1 items-center justify-center">
      <VariableContextProvider
        value={{
          "--custom": "pink",
        }}
      >
        <View className="bg-[var(--custom,green)] w-10 h-10" />

        <CustomView className="bg-[var(--custom,purple)] w-10 h-10" />
      </VariableContextProvider>
    </View>
  );
}
