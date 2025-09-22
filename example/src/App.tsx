import { StyleSheet, Text } from "react-native";

import { StatusBar } from "expo-status-bar";
import { View } from "react-native-css/components/View";

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Hello world!!</Text>
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
