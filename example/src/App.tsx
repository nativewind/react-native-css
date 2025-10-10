import { Button, Text, View } from "react-native";

import { StatusBar } from "expo-status-bar";

import "../global.css";

export default function App() {
  return (
    <View className="flex-1 bg-white items-center justify-center">
      <Text className="text-red-800 text-2xl font-bold animate-bounce">
        Hello world!!!
      </Text>
      <Button title="test2" className="text-red-500" />
      <StatusBar style="auto" />
    </View>
  );
}
