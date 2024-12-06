---
sidebar_position: 2
title: Writing a custom compiler
---

# Intro

In this guide we will port the popular [vanilla-extract](https://vanilla-extract.style/) CSS library to React Native

For CSS to work in React Native you need to different things

- A compiler to turn a CSS file into JavaScript
- A runtime that can apply the styles provided by the compiler

At a high level, all components libraries work this way `react-native-css` is just more explicit. Also unlike most other libraries, the compiler is run at build time, not at runtime.

:::danger

Writing a custom compiler is a complex task and requires a deep understanding of the CSS framework and Metro. This guide takes you though the **simplest** real world scenario. Be prepared that you will most likely need to read the source code of the libraries you are integrating, as libraries are not built for out-of-the-box Metro integration.

:::

## Understanding vanilla-extract

`vanilla-extract` is a zero-runtime CSS-in-JS library that generates a CSS stylesheet based upon a TypeScript file.

Styles are declared in a TypeScript file with the extension `.css.ts`

```ts title=styles.css.ts
import { style } from "@vanilla-extract/css";

export const container = style({
  padding: 10,
});
```

And then used directly in your components

```tsx title=Component.tsx
import { container } from "./styles.css.ts";

document.write(`
  <section class="${container}">
    ...
  </section>
`);
```

`vanilla-extract` integrations need to generates the CSS file and ensure it is bundled. The CSS file contains the CSS classes that were declared in the `.css.ts` file.

```css
.styles_container__1hiof570 {
  padding: 10px;
}
```

## Configuring Metro

The default metro configuration will setup the `runtime` and `compiler` to compile any `.css` files.

```js title=metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withCSS } = require("react-native-css/metro");

const config = getDefaultConfig(__dirname);

return withCSS(config)
```

## Customizing for vanilla-extract

We need to integrate the `vanilla-extract` compiler into Metro. The compiler will take the `.css.ts` files and generate a JavaScript file that can be used by the runtime.

```js title=metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { cssFileFilter } = require("@vanilla-extract/integration")
const { withCSS } = require("react-native-css/metro");

const config = getDefaultConfig(__dirname);

return withCSS(config, {
  // vanilla-extract can only process files with the .css.ts extension
  cssFileFilter
  // The cssTransformerPath should points to a JS module that will transform the CSS file into a JS file
  cssTransformerPath: "./css-transformer.js"
})
```

```js title=css-transformer.js
modules.exports = function (source, options, platform) {
  return platform === "web"
    ? processWeb(source, options)
    : processNative(source, options);
};
```

## Adding `processWeb`

While `vanilla-extract` provides multiple bundler integrations, it is unlikely for web libraries to provide a Metro integration. You can easily add one by using the `@vanilla-extract/integration` package.

```js title=css-transformer.js
const {
  compile as compileVanillaExtract,
  getSourceFromVirtualCssFile,
  processVanillaFile,
} = require("@vanilla-extract/integration")

async function processWeb (css, options) {
  const identOption = options.dev ? "debug" : "short";

  // Compile the `.css.ts` into a `.js` file using vanilla-extract
  const vanillaExtractCompiled = await compileVanillaExtract({
    filePath: options.fileName,
    cwd: options.projectRoot,
    esbuildOptions: undefined,
    identOption,
  });

  const vanillaExtractJS = await processVanillaFile({
    source: vanillaExtractCompiled.source,
    filePath: filename,
    identOption,
  });

  const virtualCssFile = vanillaExtractJS.match(CSS_IMPORT_REGEX)?.[0]
  if (!virtualCssFile) {
    throw new Error("Could not find the CSS import");
  }

  // Get the CSS file from vanilla-extract
  const cssFile = await getSourceFromVirtualCssFile(virtualCssFile);

  /*
   * Run the CSS though Metro's transformer.
   * This will create an orphaned JS file (its not being imported by anything)
   */
  const {
    output: [{ data: metroCSS }],
  } = await options.transform(cssFile.fileName, cssFile.source)

  // MetroCSS is a JS module that is wrapped with Metro's module system.
  // We will need to remove this wrapper code, as we will need to reprocess
  // this file again with the VanillaExtract JS file

  // Remove the first and last line, stripping Metro's module system
  const metroJS = metroCSS.replace(/^.*?\n|\n[^\n]*$/g, '');

  // Combine the two JS files together
  const transformedFile = await options.transform(
    filename,
    Buffer.from(`${metroJS};${unwrappedCSSCode}`),
  );

  // Append the CSS asset reference to the JS file
  transformedFile.output[0].data.css = metroCSS.css;

  return transformedFile
}
```

## Adding `processNative`

The `processNative` function is responsible for transforming the CSS file into a JavaScript file that can be used in React Native. For `vanilla-extract` this will will be a multi-step process, as we need to compile it with `vanilla-extract` and also `react-native-css`.

```js title=css-transformer.js
import {
  compile as compileVanillaExtract,
  getSourceFromVirtualCssFile,
  processVanillaFile,
} from "@vanilla-extract/integration";
import {
  compile as compileReactNativeCss,
  ProcessCSS,
} from "react-native-css/compiler";

const CSS_IMPORT_REGEX = /^import '(\w+)';/;

async function processNative(css, options) {
  const identOption = options.dev ? "debug" : "short";

  // Compile the `.css.ts` into a `.js` file using vanilla-extract
  const vanillaExtractCompiled = await compileVanillaExtract({
    filePath: options.fileName,
    cwd: options.projectRoot,
    esbuildOptions: undefined,
    identOption,
  });

  const vanillaExtractJS = await processVanillaFile({
    source: vanillaExtractCompiled.source,
    filePath: filename,
    identOption,
  });

  const virtualCssFile = vanillaExtractJS.match(CSS_IMPORT_REGEX)?.[0];
  if (!virtualCssFile) {
    throw new Error("Could not find the CSS import");
  }

  // Get the CSS file from vanilla-extract
  const cssFile = await getSourceFromVirtualCssFile(virtualCssFile);

  // Compile the CSS file into a JavaScript file using react-native-css
  const reactNativeCSS = await compileReactNativeCss(cssFile, {
    output: "json",
  });

  // Remove the CSS import from the vanilla-extract file, as it cannot be used in React Native
  let reactNativeJS = vanillaExtractJS.replace(cssImport, "");

  // Append the react-native-css StyleSheet.register call
  reactNativeJS += `;import('react-native-css/runtime').StyleSheet.register(${reactNativeCSS})`;

  return reactNativeJS;
}
```

## Running the code

Your `vanilla-extract` styles should now be working in React Native.

```ts title=app.ts
import { container } from "./styles.css.ts";

export default function App() {
  return (
    <View style={container}>
      <Text>Hello World</Text>
    </View>
  );
}
```

```ts title=styles.css.ts
import { style } from "@vanilla-extract/css";

export const container = style({
  padding: 10,
});
```
