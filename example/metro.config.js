const { getDefaultConfig } = require("@expo/metro-config");
const { withReactNativeCSS } = require("react-native-css/metro");

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

/**
 * This block of code is not required, it just makes the example work in this monorepo setup.
 */
const path = require("path");
config.watchFolders = [path.resolve(__dirname, "../")];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "../node_modules"),
];

module.exports = withReactNativeCSS(config, {
  globalClassNamePolyfill: true,
});
