const path = require("path");
const { getDefaultConfig } = require("@expo/metro-config");
const { withCss } = require("react-native-css/metro");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Ignore this code. This is just to make the example work within this mono-repo
const packagesRoot = path.resolve(projectRoot, "../packages");
config.watchFolders = [packagesRoot];
config.resolver.nodeModulesPaths = [
  packagesRoot,
  path.resolve(projectRoot, "node_modules"),
];

module.exports = withCss(config);
