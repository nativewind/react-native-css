import { Text, View } from "react-native";

import { StatusBar } from "expo-status-bar";

import "../global.css";

export default function App() {
  return (
    <View className="flex-1 bg-white items-center justify-center">
      <Text className="text-blue-800 animate-bounce">Hello world!!!</Text>
      <StatusBar style="auto" />
    </View>
  );
}
