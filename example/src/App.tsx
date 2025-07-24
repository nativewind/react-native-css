import { Text, View } from "react-native";

import "../global.css";

export default function App() {
  return (
    <>
      <View className="justify-center items-center flex-1 bg-linear-to-r from-cyan-500 to-blue-500">
        <Text className="">Test Component</Text>
      </View>
      <View
        className="justify-center items-center flex-1"
        style={{
          experimental_backgroundImage: "linear-gradient(to right, #f00, #0f0)",
        }}
      >
        <Text className="">Test Component2</Text>
      </View>
    </>
  );
}
