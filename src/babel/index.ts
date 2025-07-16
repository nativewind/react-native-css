/* eslint-disable */
module.exports = function () {
  return {
    plugins: [
      require("./import-plugin").default,
      "react-native-worklets/plugin",
    ],
  };
};
