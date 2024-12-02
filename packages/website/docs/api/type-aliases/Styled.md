# Type Alias: Styled()

> **Styled**: \<`C`, `M`\>(`component`, `mapping`, `options`?) => `ComponentType`\<`ComponentProps`\<`C`\> & \{ \[K in keyof M as K extends string ? M\[K\] extends undefined \| false ? never : M\[K\] extends true \| FlattenComponentProps\<C\> ? K : M\[K\] extends \{ target: (...) \| (...) \} \| \{ nativeStyleToProp: Record\<(...), (...)\>; target: false \} ? K : never : never\]?: string \}\>

********************************    API    ********************************

## Type Parameters

• **C** *extends* `ReactComponent`\<`any`\>

• **M** *extends* [`StyledConfiguration`](StyledConfiguration.md)\<`C`\>

## Parameters

### component

`C`

### mapping

`M` & [`StyledConfiguration`](StyledConfiguration.md)\<`C`\>

### options?

[`StyledOptions`](StyledOptions.md)

## Returns

`ComponentType`\<`ComponentProps`\<`C`\> & \{ \[K in keyof M as K extends string ? M\[K\] extends undefined \| false ? never : M\[K\] extends true \| FlattenComponentProps\<C\> ? K : M\[K\] extends \{ target: (...) \| (...) \} \| \{ nativeStyleToProp: Record\<(...), (...)\>; target: false \} ? K : never : never\]?: string \}\>

## Defined in

[runtime.types.ts:381](https://github.com/nativewind/react-native-css/blob/0419a1b0b908b601d12a297cd9a323026e985f88/packages/react-native-css/src/runtime/runtime.types.ts#L381)
