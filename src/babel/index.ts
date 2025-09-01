/* eslint-disable */
export default function () {
  return {
    plugins: [
      require("./import-plugin").default,
      "react-native-worklets/plugin",
    ],
  };
}
