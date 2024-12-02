# MediaCondition

```ts
type MediaCondition:
  | ["!!", MediaFeatureNameFor_MediaFeatureId]
  | ["!", MediaCondition]
  | ["&", MediaCondition[]]
  | ["|", MediaCondition[]]
  | ["=", MediaFeatureNameFor_MediaFeatureId, StyleDescriptor]
  | ["==", MediaFeatureNameFor_MediaFeatureId, StyleDescriptor, MediaFeatureComparison]
  | ["[]", MediaFeatureNameFor_MediaFeatureId, StyleDescriptor, MediaFeatureComparison, StyleDescriptor, MediaFeatureComparison];
```

************\*\*\*\************* Conditions **************\***************

## Defined in

[compiler/compiler.types.ts:258](https://github.com/nativewind/react-native-css/blob/83125aa9006bd52788fb23ba03d168e1262bcadb/packages/react-native-css/src/compiler/compiler.types.ts#L258)
