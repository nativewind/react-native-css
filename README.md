# react-native-css

A CSS polyfill for React Native's native platforms

## Installation

## Usage

### Without `globalClassNamePolyfill`

If you are not using the `globalClassNamePolyfill`, you can use the library by importing the React Native components directly from `react-native-css/components`:

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

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
