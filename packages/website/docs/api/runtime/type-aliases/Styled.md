# Styled()

```ts
type Styled: <C, M>(component, mapping, options?) => ComponentType<ComponentProps<C> & { [K in keyof M as K extends string ? M[K] extends undefined | false ? never : M[K] extends true | FlattenComponentProps<C> ? K : M[K] extends { target: (...) | (...) } | { nativeStyleToProp: Record<(...), (...)>; target: false } ? K : never : never]?: string }>;
```

**************\*\*\*\*************** API **************\*\*\*\***************

## Type Parameters

• **C** _extends_ `ReactComponent`\<`any`\>

• **M** _extends_ [`StyledConfiguration`](StyledConfiguration.md)\<`C`\>

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

[runtime/runtime.types.ts:63](https://github.com/nativewind/react-native-css/blob/a400e1318389c5ae2af21e895162179d7418d761/packages/react-native-css/src/runtime/runtime.types.ts#L63)
