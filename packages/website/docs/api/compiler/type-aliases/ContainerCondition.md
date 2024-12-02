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

[compiler/compiler.types.ts:319](https://github.com/nativewind/react-native-css/blob/83125aa9006bd52788fb23ba03d168e1262bcadb/packages/react-native-css/src/compiler/compiler.types.ts#L319)
