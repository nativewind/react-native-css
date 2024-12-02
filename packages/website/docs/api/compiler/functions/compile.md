# compile()

```ts
function compile(code, options): ReactNativeCssStyleSheet;
```

Converts a CSS file to a collection of style declarations that can be used with the StyleSheet API

## Parameters

### code

The CSS file contents

`string` | `Buffer`

### options

[`CompilerOptions`](../interfaces/CompilerOptions.md) = `{}`

Compiler options

## Returns

[`ReactNativeCssStyleSheet`](../interfaces/ReactNativeCssStyleSheet.md)

A `ReactNativeCssStyleSheet` that can be passed to `StyleSheet.register` or used with a custom runtime

## Defined in

[compiler/compiler.ts:56](https://github.com/nativewind/react-native-css/blob/83125aa9006bd52788fb23ba03d168e1262bcadb/packages/react-native-css/src/compiler/compiler.ts#L56)
