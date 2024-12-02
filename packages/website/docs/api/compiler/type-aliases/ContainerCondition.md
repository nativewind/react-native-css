# ContainerCondition

```ts
type ContainerCondition:
  | ["!!", MediaFeatureNameFor_ContainerSizeFeatureId]
  | ["!", ContainerCondition]
  | ["&", ContainerCondition[]]
  | ["|", ContainerCondition[]]
  | [MediaFeatureComparison, MediaFeatureNameFor_ContainerSizeFeatureId, StyleDescriptor]
  | ["[]", MediaFeatureNameFor_ContainerSizeFeatureId, StyleDescriptor, MediaFeatureComparison, StyleDescriptor, MediaFeatureComparison];
```

## Defined in

[compiler/compiler.types.ts:313](https://github.com/nativewind/react-native-css/blob/a400e1318389c5ae2af21e895162179d7418d761/packages/react-native-css/src/compiler/compiler.types.ts#L313)
