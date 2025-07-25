# react-native-css

A CSS polyfill for React Native

The goal of this library is to provide the most complete CSS support for React Native, within the limitations of Yoga and the core React Native package. This includes multiple advanced CSS features like media queries, container queries, CSS variables, and more.

## Installation

1. Create a CSS file in your project, e.g. `styles.css`.
2. Import the CSS file in your App entry point, or root layout component:
3. Setup the bundler using one of the methods below.

### Metro based projects

> [!TIP]  
> All Expo and React Native Community CLI projects use Metro as the bundler, so this guide applies to them.

You will need to add `withReactNativeCSS` to your Metro configuration.

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

### Via hooks

#### `useCssElement`

You can also use the `useCssElement` hook.

```ts
import { View as RNView } from 'react-native';
import { useCssElement } from 'react-native-css';

export default function App() {
  const Container = useCssElement(RNView, {
    className: "container",
  });

  const Box = useCssElement(RNView, {
    className: "container",
  });

  return (
    <Container>
      <Box />
    </Container>
  );
}
```

> [!IMPORTANT]  
> The hook returns a React Element, not a style object. The element will work on all platforms and will correctly apply the React context needed to support all features of the library

#### `useNativeCssStyle`

If you just require the style object, you can use the `useNativeCssStyle` hook:

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

#### `useNativeCssVariable`

If you just require a CSS variable value, you can use the `useNativeCssVariable` hook:

```ts
import { useNativeCssVariable } from 'react-native-css';

export default function App() {
  const myColor = useNativeCssVariable("my-color");

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

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

See the [license](LICENSE) file for more details.

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
