# compile()

```ts
function compile(code, options): ReactNativeCssStyleSheet;
```

Converts a CSS file to a collection of style declarations that can be used with the StyleSheet API

## Parameters

### code

The CSS file contents111

`string` | `Buffer`

### options

[`CompilerOptions`](../interfaces/CompilerOptions.md) = `{}`

(Optional) Options for the conversion process

## Returns

[`ReactNativeCssStyleSheet`](../interfaces/ReactNativeCssStyleSheet.md)

An object containing the extracted style declarations and animations

## Defined in

[compiler/compiler.ts:56](https://github.com/nativewind/react-native-css/blob/a400e1318389c5ae2af21e895162179d7418d761/packages/react-native-css/src/compiler/compiler.ts#L56)
