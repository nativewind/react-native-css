# Function: styled()

> **styled**\<`C`, `M`\>(`component`, `mapping`, `options`?): `ComponentType`\<`ComponentProps`\<`C`\> & \{ \[K in string \| number \| symbol as K extends string ? M\[K\<K\>\] extends undefined \| false ? never : M\[K\<K\>\] extends true \| FlattenComponentProps\<C\> ? K\<K\> : M\[K\<K\>\] extends \{ target: true \| FlattenComponentProps\<(...)\> \} \| \{ nativeStyleToProp: Record\<string, unknown\>; target: false \} ? K\<K\> : never : never\]?: string \}\>

## Type Parameters

• **C** *extends* `ReactComponent`\<`any`\>

• **M** *extends* [`StyledConfiguration`](../type-aliases/StyledConfiguration.md)\<`C`\>

## Parameters

### component

`C`

### mapping

`M` & [`StyledConfiguration`](../type-aliases/StyledConfiguration.md)\<`C`\>

### options?

[`StyledOptions`](../type-aliases/StyledOptions.md)

## Returns

`ComponentType`\<`ComponentProps`\<`C`\> & \{ \[K in string \| number \| symbol as K extends string ? M\[K\<K\>\] extends undefined \| false ? never : M\[K\<K\>\] extends true \| FlattenComponentProps\<C\> ? K\<K\> : M\[K\<K\>\] extends \{ target: true \| FlattenComponentProps\<(...)\> \} \| \{ nativeStyleToProp: Record\<string, unknown\>; target: false \} ? K\<K\> : never : never\]?: string \}\>

## Defined in

[web/index.ts:13](https://github.com/nativewind/react-native-css/blob/0419a1b0b908b601d12a297cd9a323026e985f88/packages/react-native-css/src/runtime/web/index.ts#L13)