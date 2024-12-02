# Type Alias: StyledConfiguration\<C\>

> **StyledConfiguration**\<`C`\>: `Record`\<`string`, `boolean` \| `FlattenComponentProps`\<`C`\> \| \{`nativeStyleToProp`: \{ \[K in keyof RNStyle & string \| "fill" \| "stroke"\]?: K extends FlattenComponentProps\<C\> ? FlattenComponentProps\<C\> \| true : FlattenComponentProps\<C\> \};`target`: `false`; \} \| \{`nativeStyleToProp`: \{ \[K in keyof RNStyle & string \| "fill" \| "stroke"\]?: K extends FlattenComponentProps\<C\> ? FlattenComponentProps\<C\> \| true : FlattenComponentProps\<C\> \};`target`: `FlattenComponentProps`\<`C`\> \| `true`; \}\>

## Type Parameters

• **C** *extends* `ReactComponent`\<`any`\>

## Defined in

[runtime.types.ts:409](https://github.com/nativewind/react-native-css/blob/0419a1b0b908b601d12a297cd9a323026e985f88/packages/react-native-css/src/runtime/runtime.types.ts#L409)
