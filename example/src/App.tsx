import { Text, View } from "react-native";

import "../global.css";

export default function App() {
  return (
    <>
      <View className="justify-center items-center h-full">
        <Text className="text-green-500 ring-2 ring-blue-500 shadow-xl shadow-red-500">
          Test Component
        </Text>
      </View>
    </>
  );
}
