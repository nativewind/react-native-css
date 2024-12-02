# Type Alias: StyleRuleSet

> **StyleRuleSet**: [[`StyleRule`](../interfaces/StyleRule.md)[]] \| [[`StyleRule`](../interfaces/StyleRule.md)[] \| `undefined`, [`StyleRule`](../interfaces/StyleRule.md)[]]

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

[runtime.types.ts:35](https://github.com/nativewind/react-native-css/blob/0419a1b0b908b601d12a297cd9a323026e985f88/packages/react-native-css/src/runtime/runtime.types.ts#L35)
