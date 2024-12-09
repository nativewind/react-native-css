module.exports = function () {
  return {
    plugins: [
      require("./import-plugin").default,
      [
        "@babel/plugin-transform-react-jsx",
        {
          runtime: "automatic",
          importSource: "react-native-css",
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
