# react-native-css

`react-native-css` is a set of utilities that when used together add CSS support to React Native. It supports media queries, pseudo classes, css variables and the majority of popular CSS features.

This library can be used standalone for pure CSS support, or can be configured to use a zero-runtime CSS-in-JS library.

## Using `react-native-css`

Below are some libraries that use `react-native-css` with a CSS framework

- [NativeWind (TailwindCSS)](https://nativewind.dev)

Please see our [docs](https://react-native-css.dev) for more detailed usage information and instructions on how to integrate with other libraries.

## Core Modules

`react-native-css` is split into 4 modules and together they provide a complete styling solution for React Native. However each module can be used standalone for adding CSS support to another styling library.

| Module | Description |
| `compile` | Compiles CSS into a JSON structure |
| `runtime` | Apply the styles either via a JSX transform, a higher order component or a hook |
| `babel` | A babel plugin to setup the JSX transform |
| `metro` | A metro plugin to setup `compile` and `runtime` |

## Usage without a framework

There are 3 ways to use `react-native-css`

| Method        | Description                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------- |
| JSX Transform | Automatically configure all components to work with CSS. Allows styling 3rd party components |
| `styled()`    | Manually configure select components.                                                        |
| `useCss()`    | Apply the transform as a hook. Note: This returns a `ReactElement` not a style object        |

All methods will require you to configure Metro to process the CSS files.

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withCSS } = require("react-native-css/metro");

const config = getDefaultConfig(__dirname);

return withCSS(config)
```

### With JSX transform

You will need to configure Babel to use the `react-native-css/babel` plugin.

```js
// babel.config.js
module.exports = {
  plugins: ["react-native-css/babel"],
};
```

```tsx
import { Text } from "react-native";

import "./global.css"; // Import global styles

const App = () => {
  return <Text className="text-red-500">Hello World</Text>;
};
```

### With styled()

```tsx
import { Text } from "react-native";

import "./global.css"; // Import global styles

const StyledText = styled(Text);

const App = () => {
  return <StyledText className="text-red-500">Hello World</StyledText>;
};
```

### With useCss()

> [!NOTE] > `useCss` returns a `ReactElement` not a style object. CSS rules can set other properties, not just styles (e.g CSS variables, containers, etc) so it is not possible to return just a style object.

```tsx
import { Text } from "react-native";

import { useCss } from "react-native-css/runtime";

import "./global.css"; // Import global styles

const StyledText = (props: TextProps) => {
  return useCss(Text, props);
};

const App = () => {
  return <StyledText className="text-red-500">Hello World</StyledText>;
};
```

### React Native Web

`react-native-css/metro` only supports React Native Web with Expo, as it is the only React Native framework that configures Metro to support CSS. If you are using the `react-native-community/cli` you will need to manually ensure the stylesheets are linked in your `.html` file. If you are using a preprocessor you may have to run it externally to Metro.
