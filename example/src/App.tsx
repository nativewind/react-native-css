import { Text, View } from "react-native";

import "../global.css";

export default function App() {
  console.log("App component rendered");
  return (
    <View className="container">
      <Text className="text-red-500">Hello World </Text>
    </View>
  );
}
