import { StyleSheet, Text, View } from "react-native";

import { StatusBar } from "expo-status-bar";

import "../global.css";

export default function App() {
  return (
    <View style={styles.container}>
      <Text className="text-red-800">Hello world!!!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
