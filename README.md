# react-native-css

A CSS polyfill for React Native

The goal of this library is to provide the most complete CSS support for React Native, within the limitations of Yoga and the core React Native package. This includes multiple advanced CSS features like media queries, container queries, CSS variables, and more.

## Installation

1. Create a CSS file in your project, e.g. `styles.css`.
2. Import the CSS file in your App entry point, or root layout component:
3. Setup the bundler using one of the methods below.

### Metro based projects

> [!TIP]  
> Most React Native projects use Metro as the bundler.

You will need to add `withReactNativeCSS` to your Metro configuration.

#### Expo Projects

```ts
import { getDefaultConfig } from "expo/metro-config";
import { withReactNativeCSS } from "react-native-css/metro";

const defaultConfig = getDefaultConfig(__dirname);

export default withReactNativeCSS(defaultConfig);

// OR with the globalClassNamePolyfill enabled
export default withReactNativeCSS(defaultConfig, {
  globalClassNamePolyfill: true,
});
```

#### Non-Expo Projects

`react-native-css` relies on the bundler to process CSS files. Currently only Expo provides a CSS asset pipeline. Since the Expo SDK is modular, you can add this functionality by just using the `@expo/metro-config` package.

Follow the Expo instructions, but replace the `expo` package with `@expo/metro-config`.

```diff
- import { getDefaultConfig } from "expo/metro-config";
+ import { getDefaultConfig } from "@expo/metro-config";
```

### Other bundlers

`react-native-css` officially only supports Metro as the bundler, but we welcome community contributions to support other bundlers like Webpack, Vite or Turbopack.

More documentation coming soon.

## Usage

You can use the library by importing the React Native components directly from `react-native-css/components`:

```ts
import { View } from 'react-native-css/components';

import "./styles.css";

export default function App() {
  return (
    <View className="container">
      <View className="box" />
    </View>
  );
}
```

### With `globalClassNamePolyfill`

Enabling the `globalClassNamePolyfill` allows you to use the classNames prop on any React Native component, similar to how you would use it in a web application.

```ts
import { View } from 'react-native';

import "./styles.css";

export default function App() {
  return (
    <View className="container">
      <View className="box" />
    </View>
  );
}
```

To enable the `globalClassNamePolyfill`, you need to enable it in your Metro configuration:

```ts
import { withReactNativeCSS } from "react-native-css/metro";

module.exports = withReactNativeCSS(
  {
    // Your existing Metro configuration
  },
  {
    globalClassNamePolyfill: true,
  },
);
```

### Via `styled`

You can also use the `styled` function to get styled components.

```ts
import { View } from 'react-native';
import { styled } from 'react-native-css';

import "./styles.css";

const MyView = styled(View)

export default function App() {
  return (
    <MyView className="container">
      <MyView className="box" />
    </MyView>
  );
}
```

### Via hooks

You can also use the `useCssElement` hook.

```ts
import { View } from 'react-native';
import { useCssElement } from 'react-native-css';

export default function App() {
  const Container = useCssElement(View, {
    className: "container",
  });

  const Box = useCssElement(View, {
    className: "box",
  });

  return (
    <Container>
      <Box />
    </Container>
  );
}
```

> [!IMPORTANT]  
> The hook returns a React Element, not a style object.

#### `useNativeCssStyle`

If you just require the style object, you can use the `useNativeCssStyle` hook

```ts
import { View as RNView } from 'react-native';
import { useNativeCssStyle } from 'react-native-css';

import "./styles.css";

export default function App() {
  return (
    <View style={useNativeCssStyle("container")}>
      <Text style={useNativeCssStyle("my-text")}>
        Hello, world!
      </Text>
    </View>
  )
}
```

> [!IMPORTANT]  
> This hook may will only work on native platforms. It will return an empty object on web.
> This hook may not support all features of the library.
> This hooks does not support container queries or inheritance for children elements.

#### `useNativeVariable`

If you just require a CSS variable value, you can use the `useNativeVariable` hook:

```ts
import { useNativeVariable } from 'react-native-css';

export default function App() {
  const myColor = useNativeVariable("--my-color");

  return (
    <View style={{ backgroundColor: myColor }}>
      <Text style={{ color: myColor }}>
        Hello, world!
      </Text>
    </View>
  )
}
```

> [!IMPORTANT]  
> This hook may will only work on native platforms. It will return `undefined` on web.
> This hook may not support all features of the library.

## CSS variables

It is preferable that all CSS variables are set via CSS. If you need values to change dynamically, we recommend using a class to change the values.

```css
.theme-red {
  --brand-color: red;
}

.theme-blue {
  --brand-color: blue;
}
```

As a last resort, you can use `VariableContext` to dynamically set CSS variables in JavaScript

```ts
import { VariableContext } from 'react-native-css';

export default function App() {
  return (
    <VariableContext values={{ "--my-color": "red" }}>
      <Text className="my-color-text">
        Hello, world!
      </Text>
    </VariableContext>
  )
}
```

This API only allows for setting CSS variables as primitive values. For more complex styles, you will need to use a helper CSS class.

> [!IMPORTANT]  
> By using `VariableContext` you may need to disable the `inlineVariable` optimization

## Optimizations

CSS is a dynamic styling language that use highly optimized engines that are not available in React Native. Instead, we optimize the styles to improve performance

These optimizations are only applied in native environments and are enabled by default.

### Inline REM units

All `rem` units are converted to `dp` units at build time. On native, the default dp is 14. You can change the default `rem` by passing a `inlineRem` option to the `withReactNativeCSS` function.

```tsx
export default withReactNativeCSS(defaultConfig, {
  inlineRem: 16, // change to 16dp,
});
```

### Inline CSS Custom Properties (variables)

Custom properties (sometimes referred to as CSS variables or cascading variables) are a way to store values that can be reused throughout a CSS document. They are defined using a property name that starts with `--`, and their values can be accessed using the `var()` function.

To improve performance, Custom properties that are only set **once** in the CSS file are inlined at build time.

For example

```css
:root {
  --my-var: red;
  --var-with-two-possible-values: blue;
}

.my-class {
  --var-with-two-possible-values: green;
  color: var(--my-var);
  background-color: var(--var-with-two-possible-values);
}
```

Is converted to:

```css
:root {
  --var-with-two-possible-values: blue;
}

.my-class {
  color: red; /* This was inlined and the variable was removed */

  /* These are preserved as there are multiple possible values */
  --var-with-two-possible-values: green;
  background-color: var(--var-with-two-possible-values);
}
```

Using `VariableContext` with `inlineVariables` may have unexpected results, as rules may have been rewritten not to use a variable. You can disable this behavior by setting `inlineVariables: false`

```tsx
export default withReactNativeCSS(defaultConfig, {
  inlineVariables: false,
});
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

To quickly get started with the project, you can run:

```sh
yarn init -2     # We require Yarn 4
yarn clean       # Install dependencies, rebuild the project and example app
yarn example ios # Or yarn example android
```

Once the example app is built, you can use

```sh
yarn example start       # Start Expo CLI
yarn example start:build # Rebuild the project and start Expo CLI
yarn example start:debug # Rebuild the project and start Expo CLI with debug logging
```

> [!TIP]  
> `start:build` and `start:debug` will clear the cache before starting the Expo CLI. If you are experiencing issue with `yarn example start` not reflecting your changes, try running `yarn example start:build` or `yarn example start:debug`.

## License

MIT

See the [license](LICENSE) file for more details.

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
