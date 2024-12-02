# StyledConfiguration\<C\>

```ts
type StyledConfiguration<C>: Record<string, boolean | FlattenComponentProps<C> | {
  nativeStyleToProp: { [K in keyof RNStyle & string | "fill" | "stroke"]?: K extends FlattenComponentProps<C> ? FlattenComponentProps<C> | true : FlattenComponentProps<C> };
  target: false;
 } | {
  nativeStyleToProp: { [K in keyof RNStyle & string | "fill" | "stroke"]?: K extends FlattenComponentProps<C> ? FlattenComponentProps<C> | true : FlattenComponentProps<C> };
  target: FlattenComponentProps<C> | true;
}>;
```

## Type Parameters

• **C** _extends_ `ReactComponent`\<`any`\>

## Defined in

[runtime/runtime.types.ts:91](https://github.com/nativewind/react-native-css/blob/a400e1318389c5ae2af21e895162179d7418d761/packages/react-native-css/src/runtime/runtime.types.ts#L91)
