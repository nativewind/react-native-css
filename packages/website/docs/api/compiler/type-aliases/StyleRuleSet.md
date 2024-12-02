# StyleRuleSet

```ts
type StyleRuleSet: [StyleRule[]] | [StyleRule[] | undefined, StyleRule[]];
```

The JS representation of a style object

This CSS rule is a single StyleRuleSet, made up of multiple StyleRules

```css
.my-class {
  color: red;
}
```

Properties are split into normal and important properties, and then split
into different StyleRules depending on their specificity, conditions, etc

## Defined in

[compiler/compiler.types.ts:53](https://github.com/nativewind/react-native-css/blob/83125aa9006bd52788fb23ba03d168e1262bcadb/packages/react-native-css/src/compiler/compiler.types.ts#L53)
