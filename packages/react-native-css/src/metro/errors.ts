import { bold } from "./picocolors";

export type ErrorMessages = typeof errorMessages;

export const errorMessages = {
  jsxBabelConfigMissing: `To use the ${bold("JSX transform")} you must have a Babel configuration file (babel.config.js) in your project root with the ${bold("'react-native-css/babel'")} preset. If you are not using the JSX transform, set 'withCSS(<config>, { jsxTransform: false })'.`,
  jsxBabelPresetMissing: `To use the ${bold("JSX transform")} you must have the ${bold("'react-native-css/babel'")} preset in your Babel configuration file (babel.config.js). If you are not using the JSX transform, set 'withCSS(<config>, { jsxTransform: false })'.`,
};
